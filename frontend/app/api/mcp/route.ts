import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { Session } from "next-auth";
import { auth } from "@/app/auth";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { logMcpTokenAuditEvent } from "@/app/lib/mcp/mcpTokenAudit";
import {
  getMcpRateLimitConfig,
  getRateLimitWindowStart,
  hashMcpToken,
  isExpired,
  MCP_TOKEN_HASH_VERSION,
} from "@/app/lib/mcp/mcpTokenSecurity";
import {
  createNovelMcpContext,
  novelMcpHttpToolDefinitions,
  runNovelMcpTool,
} from "@/app/lib/mcp/novelMcpTools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MCP_PROTOCOL_VERSION = "2025-06-18";
const SUPPORTED_PROTOCOL_VERSIONS = new Set([MCP_PROTOCOL_VERSION, "2025-03-26"]);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type JsonRpcId = string | number | null;

interface McpTokenAuth {
  authorId: string;
  tokenId: string;
}

interface JsonRpcMessage {
  id?: JsonRpcId;
  jsonrpc?: string;
  method?: string;
  params?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function jsonRpcResult(id: JsonRpcId | undefined, result: unknown, init?: ResponseInit) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      result,
    },
    init
  );
}

function jsonRpcError(
  id: JsonRpcId | undefined,
  code: number,
  message: string,
  status = 200,
  data?: unknown
) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        ...(data === undefined ? {} : { data }),
      },
    },
    { status }
  );
}

function isJsonRpcMessage(value: unknown): value is JsonRpcMessage {
  const record = asRecord(value);
  return record.jsonrpc === "2.0" && typeof record.method === "string";
}

function validateOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const requestOrigin = new URL(req.url).origin;
  const allowedOrigins = new Set(
    (process.env.MCP_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((allowedOrigin) => allowedOrigin.trim())
      .filter(Boolean)
  );

  return origin === requestOrigin || allowedOrigins.has(origin);
}

function validateProtocolVersion(req: Request) {
  const protocolVersion = req.headers.get("mcp-protocol-version");
  return !protocolVersion || SUPPORTED_PROTOCOL_VERSIONS.has(protocolVersion);
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";

  return authHeader.startsWith(prefix) ? authHeader.slice(prefix.length).trim() : "";
}

function createBearerSession(authorId: string): Session {
  return {
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: {
      id: authorId,
      name: "MCP Client",
      email: null,
      image: null,
      legacyUserIds: [],
    },
  };
}

async function consumeRateLimit(tokenId: string, now: Date) {
  const supabase = getSupabaseAdmin();
  const { maxRequests, windowSeconds } = getMcpRateLimitConfig();
  const windowStart = getRateLimitWindowStart(now, windowSeconds);
  const { data, error } = await supabase.rpc("consume_mcp_token_rate_limit", {
    p_max_requests: maxRequests,
    p_token_id: tokenId,
    p_window_seconds: windowSeconds,
    p_window_start: windowStart.toISOString(),
  });

  if (error) {
    throw error;
  }

  const result = data?.[0];

  if (!result) {
    throw new Error("MCP rate limit check did not return a result.");
  }

  return {
    allowed: result.allowed,
    maxRequests,
    requestCount: result.request_count,
    resetAt: result.reset_at,
    windowSeconds,
  };
}

async function getAuthorizedSession(req: Request) {
  const bearerToken = getBearerToken(req);

  try {
    const session = await auth();
    if (session?.user?.id) {
      return { session };
    }
  } catch (error) {
    if (!bearerToken) {
      throw error;
    }
  }

  if (!bearerToken) {
    return { error: "MCP tools require a signed-in app session or an author MCP bearer token." };
  }

  const supabase = getSupabaseAdmin();
  const { data: tokenRecord, error } = await supabase
    .from("mcp_tokens")
    .select("id, author_id, expires_at, hash_version, revoked_at")
    .eq("token_hash", hashMcpToken(bearerToken))
    .eq("hash_version", MCP_TOKEN_HASH_VERSION)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!tokenRecord || tokenRecord.revoked_at) {
    return { error: "Invalid or revoked MCP bearer token." };
  }

  const now = new Date();
  const rateLimit = await consumeRateLimit(tokenRecord.id, now);

  if (!rateLimit.allowed) {
    await logMcpTokenAuditEvent(supabase, {
      authorId: tokenRecord.author_id,
      eventType: "rate_limited",
      metadata: {
        limit: rateLimit.maxRequests,
        request_count: rateLimit.requestCount,
        reset_at: rateLimit.resetAt,
        window_seconds: rateLimit.windowSeconds,
      },
      req,
      tokenId: tokenRecord.id,
    });

    return {
      data: {
        limit: rateLimit.maxRequests,
        reset_at: rateLimit.resetAt,
        window_seconds: rateLimit.windowSeconds,
      },
      error: "MCP bearer token rate limit exceeded.",
      status: 429,
    };
  }

  if (isExpired(tokenRecord.expires_at, now)) {
    await logMcpTokenAuditEvent(supabase, {
      authorId: tokenRecord.author_id,
      eventType: "expired",
      metadata: { expires_at: tokenRecord.expires_at },
      req,
      tokenId: tokenRecord.id,
    });

    return {
      error: "MCP bearer token has expired. Generate a new token from the Author Dashboard.",
      status: 401,
    };
  }

  const { error: updateError } = await supabase
    .from("mcp_tokens")
    .update({ last_used_at: now.toISOString() })
    .eq("id", tokenRecord.id);

  if (updateError) {
    console.error("Failed to update MCP token usage:", updateError);
  }

  return {
    session: createBearerSession(tokenRecord.author_id),
    tokenAuth: {
      authorId: tokenRecord.author_id,
      tokenId: tokenRecord.id,
    } satisfies McpTokenAuth,
  };
}

function initializeResult(params: unknown) {
  const requestedVersion = asString(asRecord(params).protocolVersion);
  const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion)
    ? requestedVersion
    : MCP_PROTOCOL_VERSION;

  return {
    protocolVersion,
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: "novel-native-mcp",
      title: "Novel Native MCP",
      version: "0.1.0",
    },
    instructions:
      "Use tools with a novel_id argument. Read-only tools are available for novel outlines, lore search, and chapter inspection. Draft access requires the signed-in author or an author MCP token generated from the app dashboard.",
  };
}

function toolResultHasError(result: unknown) {
  return Object.prototype.hasOwnProperty.call(asRecord(result), "error");
}

async function handleToolsCall(req: Request, id: JsonRpcId | undefined, params: unknown) {
  const call = asRecord(params);
  const name = asString(call.name);
  const rawArguments = asRecord(call.arguments);
  const novelId = asString(rawArguments.novel_id);

  if (!name) {
    return jsonRpcError(id, -32602, "Missing tool name.");
  }

  if (!novelId) {
    return jsonRpcError(id, -32602, "Tool argument novel_id is required.");
  }

  const authResult = await getAuthorizedSession(req);
  if (authResult.error || !authResult.session) {
    return jsonRpcError(
      id,
      -32001,
      authResult.error ?? "Unauthorized MCP tool call.",
      authResult.status ?? 401,
      authResult.data
    );
  }

  const toolArguments = { ...rawArguments };
  delete toolArguments.novel_id;

  const ctx = await createNovelMcpContext(novelId, authResult.session, ai);
  const execution = await runNovelMcpTool(ctx, name, toolArguments);

  if (!execution) {
    if (authResult.tokenAuth) {
      await logMcpTokenAuditEvent(getSupabaseAdmin(), {
        authorId: authResult.tokenAuth.authorId,
        eventType: "used",
        metadata: { is_error: true, reason: "unknown_tool" },
        novelId,
        req,
        tokenId: authResult.tokenAuth.tokenId,
        toolName: name,
      });
    }

    return jsonRpcError(id, -32602, `Unknown tool: ${name}`);
  }

  const resultText = JSON.stringify(execution.result, null, 2);
  const isError = toolResultHasError(execution.result);

  if (authResult.tokenAuth) {
    await logMcpTokenAuditEvent(getSupabaseAdmin(), {
      authorId: authResult.tokenAuth.authorId,
      eventType: "used",
      metadata: { is_error: isError },
      novelId,
      req,
      tokenId: authResult.tokenAuth.tokenId,
      toolName: name,
    });
  }

  return jsonRpcResult(id, {
    content: [
      {
        type: "text",
        text: resultText,
      },
    ],
    structuredContent: execution.result,
    isError,
  });
}

async function handleJsonRpcMessage(req: Request, message: JsonRpcMessage) {
  const id = Object.prototype.hasOwnProperty.call(message, "id") ? message.id : undefined;

  switch (message.method) {
    case "initialize":
      return jsonRpcResult(id, initializeResult(message.params), {
        headers: {
          "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
        },
      });
    case "notifications/initialized":
      return new Response(null, { status: 202 });
    case "ping":
      return jsonRpcResult(id, {});
    case "tools/list":
      return jsonRpcResult(id, {
        tools: novelMcpHttpToolDefinitions,
      });
    case "tools/call":
      return handleToolsCall(req, id, message.params);
    default:
      return jsonRpcError(id, -32601, `Method not found: ${message.method}`);
  }
}

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return jsonRpcError(undefined, -32000, "Origin is not allowed for this MCP endpoint.", 403);
  }

  if (!validateProtocolVersion(req)) {
    return jsonRpcError(
      undefined,
      -32000,
      "Unsupported MCP protocol version.",
      400,
      { supported: Array.from(SUPPORTED_PROTOCOL_VERSIONS) }
    );
  }

  let message: unknown;

  try {
    message = await req.json();
  } catch {
    return jsonRpcError(undefined, -32700, "Invalid JSON.", 400);
  }

  if (Array.isArray(message)) {
    return jsonRpcError(undefined, -32600, "Batch JSON-RPC messages are not supported.", 400);
  }

  if (!isJsonRpcMessage(message)) {
    return jsonRpcError(undefined, -32600, "Invalid JSON-RPC message.", 400);
  }

  try {
    return await handleJsonRpcMessage(req, message);
  } catch (error) {
    const messageId = Object.prototype.hasOwnProperty.call(message, "id") ? message.id : undefined;
    const errorMessage = error instanceof Error ? error.message : "Unknown MCP server error.";
    console.error("MCP server error:", errorMessage);
    return jsonRpcError(messageId, -32603, "Internal MCP server error.", 500);
  }
}

export function GET() {
  return new Response("This MCP endpoint does not provide a standalone SSE stream.", {
    status: 405,
    headers: {
      Allow: "POST",
    },
  });
}

export function DELETE() {
  return new Response("MCP sessions are stateless for this endpoint.", {
    status: 405,
    headers: {
      Allow: "POST",
    },
  });
}

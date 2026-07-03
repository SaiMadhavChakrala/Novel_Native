import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { Session } from "next-auth";
import { auth } from "@/app/auth";
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

async function getAuthorizedSession(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return { session };
    }
  } catch (error) {
    if (!process.env.MCP_SERVER_TOKEN) {
      throw error;
    }
  }

  const expectedToken = process.env.MCP_SERVER_TOKEN;
  const bearerToken = getBearerToken(req);

  if (!expectedToken || !bearerToken || bearerToken !== expectedToken) {
    return { error: "MCP tools require a signed-in app session or a valid bearer token." };
  }

  const authorId = process.env.MCP_AUTHOR_ID;

  if (!authorId) {
    return { error: "MCP_AUTHOR_ID is required when using MCP_SERVER_TOKEN authentication." };
  }

  return { session: createBearerSession(authorId) };
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
      "Use tools with a novel_id argument. Read-only tools are available for novel outlines, lore search, and chapter inspection. Draft access requires the authenticated author.",
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
    return jsonRpcError(id, -32001, authResult.error ?? "Unauthorized MCP tool call.", 401);
  }

  const toolArguments = { ...rawArguments };
  delete toolArguments.novel_id;

  const ctx = await createNovelMcpContext(novelId, authResult.session, ai);
  const execution = await runNovelMcpTool(ctx, name, toolArguments);

  if (!execution) {
    return jsonRpcError(id, -32602, `Unknown tool: ${name}`);
  }

  const resultText = JSON.stringify(execution.result, null, 2);

  return jsonRpcResult(id, {
    content: [
      {
        type: "text",
        text: resultText,
      },
    ],
    structuredContent: execution.result,
    isError: toolResultHasError(execution.result),
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

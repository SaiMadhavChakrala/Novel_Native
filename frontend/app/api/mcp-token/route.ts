import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { syncAuthorIdentity } from "@/app/lib/authorIdentity";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { Database } from "@/app/lib/database.types";
import { logMcpTokenAuditEvent } from "@/app/lib/mcp/mcpTokenAudit";
import {
  generateMcpToken,
  getMcpTokenExpiry,
  getTokenPrefix,
  hashMcpToken,
  MCP_TOKEN_HASH_VERSION,
} from "@/app/lib/mcp/mcpTokenSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_TOKEN_NAME = "Default MCP token";

type McpTokenRow = Database["public"]["Tables"]["mcp_tokens"]["Row"];
type McpTokenMetadata = Pick<
  McpTokenRow,
  "id" | "name" | "token_prefix" | "created_at" | "expires_at" | "last_used_at" | "revoked_at"
>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getRequestBody(req: Request) {
  try {
    return asRecord(await req.json());
  } catch {
    return {};
  }
}

async function getCurrentAuthorId() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: errorResponse("Sign in before managing MCP tokens.", 401) };
  }

  const author = await syncAuthorIdentity(session);

  if (!author?.id) {
    return { error: errorResponse("Create an author profile before generating an MCP token.", 403) };
  }

  return { authorId: author.id };
}

async function getActiveToken(authorId: string): Promise<McpTokenMetadata | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("mcp_tokens")
    .select("id, name, token_prefix, created_at, expires_at, last_used_at, revoked_at")
    .eq("author_id", authorId)
    .eq("hash_version", MCP_TOKEN_HASH_VERSION)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return (data?.[0] ?? null) as McpTokenMetadata | null;
}

export async function GET() {
  try {
    const authResult = await getCurrentAuthorId();
    if (authResult.error || !authResult.authorId) return authResult.error;

    const tokenRecord = await getActiveToken(authResult.authorId);
    return NextResponse.json({ tokenRecord });
  } catch (error) {
    console.error("MCP token lookup failed:", error);
    return errorResponse("Unable to load MCP token metadata.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await getCurrentAuthorId();
    if (authResult.error || !authResult.authorId) return authResult.error;

    const body = await getRequestBody(req);
    const requestedName = typeof body.name === "string" ? body.name.trim() : "";
    const name = requestedName ? requestedName.slice(0, 80) : DEFAULT_TOKEN_NAME;
    const token = generateMcpToken();
    const now = new Date().toISOString();
    const expiresAt = getMcpTokenExpiry().toISOString();
    const supabase = getSupabaseAdmin();
    const previousToken = await getActiveToken(authResult.authorId);

    const { error: revokeError } = await supabase
      .from("mcp_tokens")
      .update({ revoked_at: now })
      .eq("author_id", authResult.authorId)
      .is("revoked_at", null);

    if (revokeError) {
      throw revokeError;
    }

    const { data, error } = await supabase
      .from("mcp_tokens")
      .insert({
        author_id: authResult.authorId,
        expires_at: expiresAt,
        hash_version: MCP_TOKEN_HASH_VERSION,
        name,
        rotated_from_token_id: previousToken?.id ?? null,
        token_hash: hashMcpToken(token),
        token_prefix: getTokenPrefix(token),
      })
      .select("id, name, token_prefix, created_at, expires_at, last_used_at, revoked_at")
      .single();

    if (error) {
      throw error;
    }

    if (previousToken) {
      await logMcpTokenAuditEvent(supabase, {
        authorId: authResult.authorId,
        eventType: "revoked",
        metadata: { reason: "rotated" },
        req,
        tokenId: previousToken.id,
      });
    }

    await logMcpTokenAuditEvent(supabase, {
      authorId: authResult.authorId,
      eventType: previousToken ? "rotated" : "created",
      metadata: {
        expires_at: expiresAt,
        rotated_from_token_id: previousToken?.id ?? null,
      },
      req,
      tokenId: data.id,
    });

    return NextResponse.json({
      token,
      tokenRecord: data as McpTokenMetadata,
    });
  } catch (error) {
    console.error("MCP token generation failed:", error);
    return errorResponse("Unable to generate MCP token.", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const authResult = await getCurrentAuthorId();
    if (authResult.error || !authResult.authorId) return authResult.error;

    const supabase = getSupabaseAdmin();
    const previousToken = await getActiveToken(authResult.authorId);
    const { error } = await supabase
      .from("mcp_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("author_id", authResult.authorId)
      .is("revoked_at", null);

    if (error) {
      throw error;
    }

    if (previousToken) {
      await logMcpTokenAuditEvent(supabase, {
        authorId: authResult.authorId,
        eventType: "revoked",
        metadata: { reason: "manual" },
        req,
        tokenId: previousToken.id,
      });
    }

    return NextResponse.json({ tokenRecord: null });
  } catch (error) {
    console.error("MCP token revocation failed:", error);
    return errorResponse("Unable to revoke MCP token.", 500);
  }
}

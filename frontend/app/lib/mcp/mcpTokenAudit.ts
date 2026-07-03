import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/app/lib/database.types";
import { hashAuditValue } from "@/app/lib/mcp/mcpTokenSecurity";

export type McpAuditEventType =
  | "created"
  | "revoked"
  | "rotated"
  | "used"
  | "expired"
  | "rate_limited";

interface McpAuditEventParams {
  authorId: string;
  eventType: McpAuditEventType;
  metadata?: Record<string, Json>;
  novelId?: string | null;
  req?: Request;
  tokenId: string;
  toolName?: string | null;
}

function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  return firstForwardedIp || req.headers.get("x-real-ip") || "";
}

export async function logMcpTokenAuditEvent(
  supabase: SupabaseClient<Database>,
  params: McpAuditEventParams
) {
  const ip = params.req ? getRequestIp(params.req) : "";
  const { error } = await supabase.from("mcp_token_audit_logs").insert({
    author_id: params.authorId,
    event_type: params.eventType,
    ip_hash: ip ? hashAuditValue(ip) : null,
    metadata: params.metadata ?? {},
    novel_id: params.novelId ?? null,
    request_origin: params.req?.headers.get("origin") ?? null,
    token_id: params.tokenId,
    tool_name: params.toolName ?? null,
    user_agent: params.req?.headers.get("user-agent") ?? null,
  });

  if (error) {
    console.error("Failed to write MCP token audit event:", error);
  }
}

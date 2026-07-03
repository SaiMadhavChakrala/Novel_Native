import "server-only";

import { createHmac, randomBytes } from "crypto";

export const MCP_TOKEN_HASH_VERSION = "hmac-sha256-v1";

const DEFAULT_TOKEN_TTL_DAYS = 90;
const DEFAULT_RATE_LIMIT_REQUESTS = 60;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const TOKEN_PREFIX_LENGTH = 18;

function getPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getMcpSecret() {
  const secret = process.env.MCP_TOKEN_PEPPER || process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET or MCP_TOKEN_PEPPER is required for MCP token hashing.");
  }

  return secret;
}

export function generateMcpToken() {
  return `mcp_live_${randomBytes(32).toString("base64url")}`;
}

export function hashMcpToken(token: string) {
  return createHmac("sha256", getMcpSecret()).update(token, "utf8").digest("hex");
}

export function hashAuditValue(value: string) {
  return createHmac("sha256", getMcpSecret()).update(value, "utf8").digest("hex");
}

export function getTokenPrefix(token: string) {
  return token.slice(0, TOKEN_PREFIX_LENGTH);
}

export function getMcpTokenTtlDays() {
  return getPositiveInteger(process.env.MCP_TOKEN_TTL_DAYS, DEFAULT_TOKEN_TTL_DAYS);
}

export function getMcpTokenExpiry(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + getMcpTokenTtlDays());
  return expiresAt;
}

export function getMcpRateLimitConfig() {
  return {
    maxRequests: getPositiveInteger(process.env.MCP_RATE_LIMIT_REQUESTS, DEFAULT_RATE_LIMIT_REQUESTS),
    windowSeconds: getPositiveInteger(
      process.env.MCP_RATE_LIMIT_WINDOW_SECONDS,
      DEFAULT_RATE_LIMIT_WINDOW_SECONDS
    ),
  };
}

export function getRateLimitWindowStart(now: Date, windowSeconds: number) {
  return new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
}

export function isExpired(expiresAt: string | null, now = new Date()) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= now.getTime());
}

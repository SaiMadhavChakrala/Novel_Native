"use client";

import { useState } from "react";
import styles from "../styles/Author.module.css";

interface McpTokenMetadata {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string | null;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface McpAuditLog {
  id: string;
  event_type: string;
  created_at: string;
  tool_name: string | null;
  novel_id: string | null;
  request_origin: string | null;
}

interface McpTokenManagerProps {
  canManageToken: boolean;
  initialAuditLogs: McpAuditLog[];
  initialToken: McpTokenMetadata | null;
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function readJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getEventLabel(eventType: string) {
  switch (eventType) {
    case "created":
      return "Created";
    case "rotated":
      return "Regenerated";
    case "revoked":
      return "Revoked";
    case "used":
      return "Tool used";
    case "expired":
      return "Expired token blocked";
    case "rate_limited":
      return "Rate limited";
    default:
      return eventType;
  }
}

export default function McpTokenManager({
  canManageToken,
  initialAuditLogs,
  initialToken,
}: McpTokenManagerProps) {
  const [tokenRecord, setTokenRecord] = useState(initialToken);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [plainToken, setPlainToken] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const hasToken = Boolean(tokenRecord);
  const isTokenExpired = Boolean(tokenRecord && new Date(tokenRecord.expires_at).getTime() <= Date.now());
  const statusLabel = hasToken ? (isTokenExpired ? "Expired" : "Active") : "Not configured";

  function prependAuditLog(eventType: string, toolName: string | null = null) {
    setAuditLogs((logs) => [
      {
        created_at: new Date().toISOString(),
        event_type: eventType,
        id: `local-${Date.now()}`,
        novel_id: null,
        request_origin: null,
        tool_name: toolName,
      },
      ...logs,
    ].slice(0, 5));
  }

  async function generateToken() {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    const eventType = hasToken ? "rotated" : "created";

    try {
      const response = await fetch("/api/mcp-token", { method: "POST" });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to generate token.");
      }

      setTokenRecord(data.tokenRecord ?? null);
      setPlainToken(typeof data.token === "string" ? data.token : "");
      prependAuditLog(eventType);
      setStatusMessage("Copy this token now. For security, it will not be shown again.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate token.");
    } finally {
      setIsBusy(false);
    }
  }

  async function revokeToken() {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch("/api/mcp-token", { method: "DELETE" });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to revoke token.");
      }

      setTokenRecord(null);
      setPlainToken("");
      prependAuditLog("revoked");
      setStatusMessage("MCP token revoked.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to revoke token.");
    } finally {
      setIsBusy(false);
    }
  }

  async function copyToken() {
    if (!plainToken) return;

    try {
      await navigator.clipboard.writeText(plainToken);
      setStatusMessage("Token copied.");
    } catch {
      setErrorMessage("Copy failed. Select the token and copy it manually.");
    }
  }

  return (
    <section className={styles.mcpPanel}>
      <div className={styles.mcpPanelHeader}>
        <div>
          <h2>MCP Access</h2>
          <p>
            Connect an external MCP client to <code className={styles.inlineCode}>/api/mcp</code> as
            your author account.
          </p>
        </div>
        <span
          className={
            hasToken && !isTokenExpired
              ? styles.mcpStatusActive
              : isTokenExpired
                ? styles.mcpStatusExpired
                : styles.mcpStatusInactive
          }
        >
          {statusLabel}
        </span>
      </div>

      {!canManageToken && (
        <p className={styles.mcpWarning}>Create an author profile before generating an MCP token.</p>
      )}

      {tokenRecord && (
        <dl className={styles.mcpMetaGrid}>
          <div>
            <dt>Token</dt>
            <dd>{tokenRecord.token_prefix}...</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(tokenRecord.created_at)}</dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{formatDate(tokenRecord.expires_at)}</dd>
          </div>
          <div>
            <dt>Last used</dt>
            <dd>{formatDate(tokenRecord.last_used_at)}</dd>
          </div>
        </dl>
      )}

      {plainToken && (
        <div className={styles.mcpSecretBox}>
          <label htmlFor="mcp-token">New token</label>
          <div className={styles.mcpSecretRow}>
            <input id="mcp-token" readOnly value={plainToken} onFocus={(event) => event.target.select()} />
            <button type="button" className={styles.buttonOutline} onClick={copyToken}>
              Copy
            </button>
          </div>
        </div>
      )}

      {(statusMessage || errorMessage) && (
        <p className={errorMessage ? styles.mcpError : styles.mcpNotice}>
          {errorMessage || statusMessage}
        </p>
      )}

      {auditLogs.length > 0 && (
        <div className={styles.mcpActivity}>
          <h3>Recent MCP Activity</h3>
          <ul className={styles.mcpActivityList}>
            {auditLogs.map((log) => (
              <li key={log.id}>
                <span>{getEventLabel(log.event_type)}</span>
                <small>
                  {log.tool_name ? `${log.tool_name} • ` : ""}
                  {formatDate(log.created_at)}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.mcpActions}>
        <button type="button" className={styles.button} onClick={generateToken} disabled={!canManageToken || isBusy}>
          {isBusy ? "Working..." : hasToken ? "Regenerate Token" : "Generate Token"}
        </button>
        {hasToken && (
          <button
            type="button"
            className={`${styles.buttonOutline} ${styles.dangerButton}`}
            onClick={revokeToken}
            disabled={!canManageToken || isBusy}
          >
            Revoke Token
          </button>
        )}
      </div>
    </section>
  );
}

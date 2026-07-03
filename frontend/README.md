# WebNovelHub Frontend

Next.js app for Novel Native.

## Getting Started

Install dependencies and run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Create a local `.env.local` from `.env.example` before running pages that need Supabase, Google sign-in, or Gemini.

## Vercel Deployment

Import the Git repository in Vercel and set the project Root Directory to `frontend`.

Use these project settings:

- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: leave empty / Vercel default

Add these Environment Variables in Vercel for Production, Preview, and Development as needed:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET`
- `MCP_TOKEN_PEPPER` recommended, used as the server-side HMAC secret for MCP token hashes. If omitted, `AUTH_SECRET` is used.
- `MCP_TOKEN_TTL_DAYS` optional, defaults to `90`
- `MCP_RATE_LIMIT_REQUESTS` optional, defaults to `60`
- `MCP_RATE_LIMIT_WINDOW_SECONDS` optional, defaults to `60`
- `MCP_ALLOWED_ORIGINS` optional, only needed if browser-based MCP clients need cross-origin access to `/api/mcp`

Run `supabase_mcp_tokens.sql` in Supabase before enabling external MCP clients. The script is idempotent and can be rerun when the MCP schema changes.

## MCP Endpoint

The app exposes a real MCP Streamable HTTP endpoint at:

```text
https://your-project.vercel.app/api/mcp
```

It supports `initialize`, `tools/list`, `tools/call`, `ping`, and the `notifications/initialized` notification. Tool calls require either an existing app session cookie or a per-author bearer token generated from the Author Dashboard:

```text
Authorization: Bearer <author_mcp_token>
```

External tokens are HMAC-hashed in the database, map to the author who generated them, expire automatically, and can be revoked or regenerated from the app UI. The MCP endpoint rate-limits token-authenticated tool calls and writes audit events for token creation, rotation, revocation, usage, expiry blocks, and rate-limit blocks. `MCP_ALLOWED_ORIGINS` is optional and only controls which browser origins can call `/api/mcp`; it is not an authentication secret.

The current tools are read-only and require a `novel_id` argument:

- `get_novel_outline`
- `search_novel_lore`
- `read_chapter`

Auth.js can infer the deployment URL on Vercel. Only set `AUTH_URL` if you have a custom auth base path or a specific proxy setup.

In Google Cloud Console, add the matching OAuth redirect URI:

```text
https://your-project.vercel.app/api/auth/callback/google
```

For local development, also add:

```text
http://localhost:3000/api/auth/callback/google
```

Before deploying, verify locally with:

```bash
npm run lint
npm run build
```

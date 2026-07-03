create extension if not exists pgcrypto;

create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references public.authors(id) on delete cascade,
  name text not null default 'Default MCP token',
  token_hash text not null unique,
  hash_version text not null default 'hmac-sha256-v1',
  token_prefix text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  last_used_at timestamptz,
  revoked_at timestamptz,
  rotated_from_token_id uuid references public.mcp_tokens(id) on delete set null
);

alter table public.mcp_tokens
  add column if not exists hash_version text;

update public.mcp_tokens
  set hash_version = 'sha256-v0'
  where hash_version is null;

update public.mcp_tokens
  set revoked_at = coalesce(revoked_at, now())
  where hash_version <> 'hmac-sha256-v1'
    and revoked_at is null;

alter table public.mcp_tokens
  alter column hash_version set default 'hmac-sha256-v1',
  alter column hash_version set not null;

alter table public.mcp_tokens
  add column if not exists expires_at timestamptz;

update public.mcp_tokens
  set expires_at = coalesce(created_at, now()) + interval '90 days'
  where expires_at is null;

alter table public.mcp_tokens
  alter column expires_at set default (now() + interval '90 days'),
  alter column expires_at set not null;

alter table public.mcp_tokens
  add column if not exists rotated_from_token_id uuid references public.mcp_tokens(id) on delete set null;

create index if not exists idx_mcp_tokens_author_id
  on public.mcp_tokens(author_id);

create unique index if not exists idx_mcp_tokens_one_active_per_author
  on public.mcp_tokens(author_id)
  where revoked_at is null;

alter table public.mcp_tokens enable row level security;

revoke all on public.mcp_tokens from anon;
revoke all on public.mcp_tokens from authenticated;
grant all on public.mcp_tokens to service_role;

create table if not exists public.mcp_token_audit_logs (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references public.mcp_tokens(id) on delete set null,
  author_id text not null references public.authors(id) on delete cascade,
  event_type text not null check (
    event_type in ('created', 'revoked', 'rotated', 'used', 'expired', 'rate_limited')
  ),
  novel_id text,
  tool_name text,
  request_origin text,
  user_agent text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mcp_token_audit_logs_author_created
  on public.mcp_token_audit_logs(author_id, created_at desc);

create index if not exists idx_mcp_token_audit_logs_token_created
  on public.mcp_token_audit_logs(token_id, created_at desc);

alter table public.mcp_token_audit_logs enable row level security;

revoke all on public.mcp_token_audit_logs from anon;
revoke all on public.mcp_token_audit_logs from authenticated;
grant all on public.mcp_token_audit_logs to service_role;

create table if not exists public.mcp_token_rate_limits (
  token_id uuid primary key references public.mcp_tokens(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.mcp_token_rate_limits enable row level security;

revoke all on public.mcp_token_rate_limits from anon;
revoke all on public.mcp_token_rate_limits from authenticated;
grant all on public.mcp_token_rate_limits to service_role;

create or replace function public.consume_mcp_token_rate_limit(
  p_token_id uuid,
  p_window_start timestamptz,
  p_window_seconds integer,
  p_max_requests integer
)
returns table(allowed boolean, request_count integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  insert into public.mcp_token_rate_limits as limits (
    token_id,
    window_start,
    request_count,
    updated_at
  )
  values (
    p_token_id,
    p_window_start,
    1,
    now()
  )
  on conflict (token_id) do update
    set window_start = case
          when limits.window_start < p_window_start then p_window_start
          else limits.window_start
        end,
        request_count = case
          when limits.window_start < p_window_start then 1
          else limits.request_count + 1
        end,
        updated_at = now()
  returning limits.window_start, limits.request_count
  into v_window_start, v_request_count;

  return query
    select
      v_request_count <= p_max_requests,
      v_request_count,
      v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_mcp_token_rate_limit(uuid, timestamptz, integer, integer)
  from public;
grant execute on function public.consume_mcp_token_rate_limit(uuid, timestamptz, integer, integer)
  to service_role;

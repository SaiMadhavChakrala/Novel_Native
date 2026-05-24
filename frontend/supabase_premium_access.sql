-- Run this in the Supabase SQL Editor before deploying the app changes.
-- Auth.js user ids are stored as text in user_profiles.id.

create table if not exists public.user_profiles (
  id text primary key,
  email text,
  display_name text,
  plan text not null default 'normal' check (plan in ('normal', 'premium')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_profiles_plan on public.user_profiles(plan);

drop function if exists public.hybrid_search_chapters(text, vector, integer, uuid);

create or replace function public.hybrid_search_chapters(
  query_text text,
  query_embedding vector,
  match_count integer,
  search_novel_id uuid,
  accessible_chapter_count integer default null
)
returns table(id uuid, title text, content text, rrf_score double precision)
language plpgsql
as $function$
begin
  return query
  with published_chapters as (
    select
      ch.id,
      ch.title,
      ch.chapter_number,
      row_number() over (order by ch.chapter_number asc) as chapter_rank
    from chapters ch
    where ch.novel_id = search_novel_id
      and ch.is_published = true
  ),
  allowed_chapters as (
    select *
    from published_chapters
    where accessible_chapter_count is null
       or chapter_rank <= accessible_chapter_count
  ),
  semantic_search as (
    select
      chunk.id,
      rank() over (order by chunk.embedding <=> query_embedding) as semantic_rank
    from chapter_chunks chunk
    join allowed_chapters ch on ch.id = chunk.chapter_id
    where chunk.novel_id = search_novel_id
    limit 20
  ),
  keyword_search as (
    select
      chunk.id,
      rank() over (
        order by ts_rank(to_tsvector('english', chunk.content), plainto_tsquery('english', query_text)) desc
      ) as keyword_rank
    from chapter_chunks chunk
    join allowed_chapters ch on ch.id = chunk.chapter_id
    where chunk.novel_id = search_novel_id
      and to_tsvector('english', chunk.content) @@ plainto_tsquery('english', query_text)
    limit 20
  )
  select
    c.id,
    ch.title,
    c.content,
    (
      coalesce(1.0 / (60 + ss.semantic_rank), 0.0) +
      coalesce(1.0 / (60 + ks.keyword_rank), 0.0)
    )::float as rrf_score
  from chapter_chunks c
  join allowed_chapters ch on c.chapter_id = ch.id
  left join semantic_search ss on c.id = ss.id
  left join keyword_search ks on c.id = ks.id
  where ss.id is not null or ks.id is not null
  order by rrf_score desc
  limit match_count;
end;
$function$;

grant execute on function public.hybrid_search_chapters(text, vector, integer, uuid, integer)
  to anon, authenticated, service_role;

-- Promote a user manually for now:
-- update public.user_profiles set plan = 'premium' where email = 'reader@example.com';


-- 1. Authors Table (Linked to your NextAuth user ID)
CREATE TABLE authors (
  -- Using TEXT because NextAuth usually outputs string IDs (CUIDs or UUIDs)
  id TEXT PRIMARY KEY, 
  pen_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Novels Table
CREATE TABLE novels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT REFERENCES authors(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  status TEXT DEFAULT 'Ongoing', -- e.g., 'Ongoing', 'Completed', 'Hiatus'
  genre TEXT[], -- Array of genres (e.g., ['Fantasy', 'Action'])
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Chapters Table
CREATE TABLE chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID REFERENCES novels(id) ON DELETE CASCADE NOT NULL,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- This will hold the actual story text
  is_published BOOLEAN DEFAULT false, -- Allows authors to save drafts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- This constraint ensures an author can't accidentally create two "Chapter 1"s for the same novel
  UNIQUE(novel_id, chapter_number) 
);

-- Optional: Create an index for faster chapter lookups when users read a novel
CREATE INDEX idx_chapters_novel_id ON chapters(novel_id);

-- ---------------------------------------------------------------------------
-- Backend migration schema inspection queries
-- ---------------------------------------------------------------------------
-- Run this block in Supabase SQL Editor if the Spring Boot backend returns a
-- schema/RPC error, then share the results. These queries are read-only.

-- 1. Confirm table columns, data types, defaults, and nullability.
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'authors',
    'novels',
    'chapters',
    'chapter_chunks',
    'user_profiles'
  )
order by table_name, ordinal_position;

-- 2. Confirm indexes used by chapter lookup, chunk lookup, and vector search.
select
  tablename as table_name,
  indexname as index_name,
  indexdef as index_definition
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'authors',
    'novels',
    'chapters',
    'chapter_chunks',
    'user_profiles'
  )
order by tablename, indexname;

-- 3. Confirm primary keys, foreign keys, unique constraints, and checks.
select
  c.relname as table_name,
  pc.conname as constraint_name,
  pg_get_constraintdef(pc.oid) as constraint_definition
from pg_constraint pc
join pg_class c on c.oid = pc.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'authors',
    'novels',
    'chapters',
    'chapter_chunks',
    'user_profiles'
  )
order by c.relname, pc.conname;

-- 4. Confirm the hybrid_search_chapters RPC signature and implementation.
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'hybrid_search_chapters'
order by p.oid;

-- 5. Confirm extensions needed by UUID generation, full text, and pgvector.
select
  extname as extension_name,
  extversion as extension_version
from pg_extension
where extname in ('vector', 'pg_trgm', 'uuid-ossp', 'pgcrypto')
order by extname;

-- 6. Sanity-check whether published chapters and chunks exist per novel.
select
  n.id as novel_id,
  n.title,
  count(distinct c.id) filter (where c.is_published = true) as published_chapters,
  count(cc.id) as indexed_chunks
from public.novels n
left join public.chapters c on c.novel_id = n.id
left join public.chapter_chunks cc on cc.chapter_id = c.id
group by n.id, n.title
order by n.title;

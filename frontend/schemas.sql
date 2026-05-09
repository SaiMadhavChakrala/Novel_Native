
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
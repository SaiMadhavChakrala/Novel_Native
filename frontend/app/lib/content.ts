import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Author {
  id: string; // From NextAuth session.user.id
  pen_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Novel {
  id: string; // UUID
  author_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: 'Ongoing' | 'Completed' | 'Hiatus';
  genre: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string; // UUID
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
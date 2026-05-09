// frontend/app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// We use the standard client. Since RLS is off, this is all you need to interact with the DB from your server.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
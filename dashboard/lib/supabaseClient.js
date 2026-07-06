import { createClient } from '@supabase/supabase-js';

// Public anon client for the frontend — safe to expose, RLS policies enforce access control.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

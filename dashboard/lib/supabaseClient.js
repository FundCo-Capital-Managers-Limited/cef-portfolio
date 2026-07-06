import { createBrowserClient } from '@supabase/ssr';

// Public anon client for client components — safe to expose, RLS policies enforce access control.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

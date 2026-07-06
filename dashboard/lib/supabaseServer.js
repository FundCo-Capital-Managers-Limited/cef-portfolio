import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server Component / Route Handler client — reads the session from request
// cookies so RLS policies apply using the logged-in user's identity.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — safe to ignore because middleware
            // refreshes the session on every request anyway.
          }
        },
      },
    }
  );
}

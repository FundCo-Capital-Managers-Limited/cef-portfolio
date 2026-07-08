import { createClient } from './supabaseClient';

/**
 * Calls the Express API with the current dashboard user's Supabase session
 * as a bearer token — used for role-gated writes (pipeline stage changes,
 * manual entry, facility management) that need server-side validation and
 * audit logging. Reads still go straight to Supabase via RLS.
 */
export async function apiFetch(path, { method = 'GET', body, headers } = {}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

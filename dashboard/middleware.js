import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');

  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // assetco_dev is a narrower-trust role than every other provisioned user —
  // but RLS here is a single is_cef_user() check (any row in `users` can read
  // all AssetCos' data), so nothing stops an assetco_dev login from reading
  // everything if they land on, say, /dashboard/registry. Real enforcement
  // has to happen here (the one place that sees every request), not just by
  // hiding nav links — confine them to the Developer Console outright.
  if (user && isProtectedRoute && !request.nextUrl.pathname.startsWith('/dashboard/dev-console')) {
    const { data: profile } = await supabase.from('users').select('role').eq('auth_user_id', user.id).maybeSingle();
    if (profile?.role === 'assetco_dev') {
      return NextResponse.redirect(new URL('/dashboard/dev-console', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { canAccessIc } from './lib/icAccess';

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
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isEngagementRoute = request.nextUrl.pathname.startsWith('/engagement');
  const isProtectedRoute = isDashboardRoute || isEngagementRoute;

  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, can_access_ic, assetco_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (isEngagementRoute && !canAccessIc(profile)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // board_member is the one role with no PIP dashboard access at all —
    // confine them to /engagement entirely, the mirror image of
    // assetco_dev's confinement to the Developer Console below. Same
    // "hiding nav links isn't the boundary" reasoning applies.
    if (isDashboardRoute && profile?.role === 'board_member') {
      return NextResponse.redirect(new URL('/engagement', request.url));
    }

    // assetco_dev is a narrower-trust role than every other provisioned user —
    // but RLS here is a single is_cef_user() check (any row in `users` can read
    // all AssetCos' data), so nothing stops an assetco_dev login from reading
    // everything if they land on, say, /dashboard/registry. Real enforcement
    // has to happen here (the one place that sees every request), not just by
    // hiding nav links — confine them to the Developer Console outright.
    if (isDashboardRoute && !request.nextUrl.pathname.startsWith('/dashboard/dev-console') && profile?.role === 'assetco_dev') {
      return NextResponse.redirect(new URL('/dashboard/dev-console', request.url));
    }

    // assetco_admin is likewise confined to their own AssetCo's pages. Several
    // portfolio-wide tables (cef_facilities, cef_series links, DREEF, flags)
    // still carry an is_cef_user()-broad RLS policy (migration 016 only
    // covered the tables that existed at the time), so an assetco_admin
    // landing on /dashboard/registry, /dashboard/pipeline, /dashboard/series,
    // or /dashboard/loan-book could read every other AssetCo's data. This is
    // the real fix — RLS tightening (migration 034) is defense-in-depth on
    // top of it, not a substitute for it.
    if (isDashboardRoute && profile?.role === 'assetco_admin') {
      const ownPath = `/dashboard/${profile.assetco_id}`;
      if (request.nextUrl.pathname !== ownPath && !request.nextUrl.pathname.startsWith(`${ownPath}/`)) {
        return NextResponse.redirect(new URL(ownPath, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/engagement/:path*', '/login'],
};

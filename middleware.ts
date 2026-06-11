/**
 * middleware.ts — Next.js Middleware for Supabase session refresh.
 *
 * WHY middleware:
 *   Supabase sessions stored in cookies need to be refreshed periodically.
 *   Middleware runs on every request before rendering, making it the ideal
 *   place to silently refresh the token and write updated cookies back to
 *   the response — without the user noticing.
 *
 * IMPORTANT: This middleware does NOT redirect unauthenticated users to a
 *   login page. Per PRD, route protection is handled at the action level
 *   (click-time gate), not at the page level.
 *
 * The supabase.auth.getUser() call here is what triggers the silent token
 * refresh. We must await it and pass the response cookies back.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, skip middleware entirely
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // First update the request cookies (for subsequent middleware)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        // Then update the response cookies (sent back to the browser)
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Trigger session refresh — must be awaited
  // This is intentionally NOT supabase.auth.getSession() because getSession()
  // doesn't validate the token from the server; getUser() does.
  await supabase.auth.getUser();

  return response;
}

/**
 * Run middleware on all routes except static files and internal Next.js paths.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico (favicon)
     * - api/tts (audio endpoint — no session needed)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

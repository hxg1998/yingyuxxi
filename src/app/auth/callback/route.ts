/**
 * /auth/callback — Supabase Magic Link callback handler.
 *
 * Supabase redirects here after the user clicks the Magic Link in their email.
 * The URL contains a `code` query parameter (PKCE flow).
 *
 * This handler:
 *   1. Exchanges the code for a session (sets the session cookie)
 *   2. Redirects to a success page that shows the "logged in" message
 *      (or to the homepage on error with a query param for the error modal)
 *
 * WHY exchangeCodeForSession instead of implicit flow:
 *   @supabase/ssr enforces PKCE by default for App Router projects,
 *   which is more secure than the implicit token-in-hash approach.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, redirect home
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/?auth_error=not_configured', request.url));
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignore read-only cookie store errors in edge cases
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message);
      return NextResponse.redirect(
        new URL('/auth/error', request.url),
      );
    }

    // Session established — redirect to the originally requested page (or home)
    // The AuthProvider's onAuthStateChange will fire on this page and show the success toast.
    const redirectUrl = new URL(next, request.url);
    redirectUrl.searchParams.set('login_success', '1');
    return NextResponse.redirect(redirectUrl);
  }

  // No code in URL — this should not happen in normal flow
  return NextResponse.redirect(new URL('/auth/error', request.url));
}

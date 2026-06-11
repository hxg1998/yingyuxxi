/**
 * supabase/server.ts
 *
 * Server-side Supabase client for Next.js 14 App Router.
 * Use this in Server Components, Route Handlers, and Server Actions.
 *
 * WHY cookies() from next/headers:
 *   Supabase SSR reads/writes the session token from HTTP cookies.
 *   On the server we must pass the cookie store so the SDK can access it.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(url, key, {
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
          // setAll is called from a Server Component when cookies() is read-only.
          // The middleware handles refreshing the session cookie instead.
        }
      },
    },
  });
}

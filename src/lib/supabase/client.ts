/**
 * supabase/client.ts
 *
 * Browser-side Supabase client using @supabase/ssr.
 * Call createBrowserClient() once per component tree — it is safe to call
 * multiple times (returns the same singleton internally).
 *
 * WHY @supabase/ssr instead of @supabase/auth-helpers-nextjs:
 *   The ssr package is the official successor for Next.js 14 App Router,
 *   correctly handles cookie-based sessions in both Server and Client Components.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Graceful degradation: if env vars are missing, return a dummy client
  // so the app doesn't crash during development/build without Supabase configured.
  if (!url || !key) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
          'Auth features will be disabled. See docs/supabase-setup.md for setup instructions.',
      );
    }
    // Return null — callers must guard against this
    return null;
  }

  return createBrowserClient(url, key);
}

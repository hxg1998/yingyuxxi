'use client';

/**
 * AuthProvider — Layout-level Client Component.
 *
 * Mounts supabase.auth.onAuthStateChange() once at the root layout level
 * and syncs all auth events to authStore (Zustand).
 *
 * WHY at Layout level:
 *   We need the listener running for the entire app lifecycle so that
 *   Magic Link callbacks (which fire in another tab) propagate the
 *   SIGNED_IN event to this tab's store when the user switches back.
 *
 * The timeout-based loading fallback (3 s) matches DESIGN §10:
 *   "session loading timeout → auto-fall to unauthenticated, no text, silent degradation"
 */

import { useEffect, useRef } from 'react';
import { Message } from '@arco-design/web-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const SESSION_LOAD_TIMEOUT_MS = 3000;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setSessionStatus } = useAuthStore();
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we've already shown the "login success" message for this session
  const loginSuccessShownRef = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      // No Supabase configured — immediately mark as unauthenticated
      setSessionStatus('unauthenticated');
      return;
    }

    // Fallback: if session doesn't resolve in 3 s, silently degrade to unauthenticated
    loadingTimerRef.current = setTimeout(() => {
      // Read current status directly from store to avoid stale closure
      const { sessionStatus } = useAuthStore.getState();
      if (sessionStatus === 'loading') {
        setSessionStatus('unauthenticated');
      }
    }, SESSION_LOAD_TIMEOUT_MS);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          createdAt: session.user.created_at,
        });
        setSessionStatus('authenticated');
      } else {
        setUser(null);
        setSessionStatus('unauthenticated');
      }
    });

    // Live listener for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          createdAt: session.user.created_at,
        });
        setSessionStatus('authenticated');

        // Show "login success" toast when landing on the page after callback redirect.
        // The callback route adds ?login_success=1 to the redirect URL.
        // We clean up the param after showing the toast to avoid re-showing on refresh.
        if (typeof window !== 'undefined' && !loginSuccessShownRef.current) {
          const params = new URLSearchParams(window.location.search);
          if (params.has('login_success')) {
            loginSuccessShownRef.current = true;
            Message.success({ content: '登录成功', duration: 2000 });
            // Remove the param from URL without triggering navigation
            params.delete('login_success');
            const newSearch = params.toString();
            const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
            window.history.replaceState(null, '', newUrl);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSessionStatus('unauthenticated');
        loginSuccessShownRef.current = false;
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Silently keep user object up to date
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          createdAt: session.user.created_at,
        });
      }
    });

    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

'use client';

/**
 * authStore.ts — Zustand store for authentication state.
 *
 * This store is the single source of truth for auth state across the app.
 * Cloud storage module (future) must read from here, NOT call supabase.auth.getUser() directly.
 *
 * Interface contract for downstream modules:
 *   - authStore.user.id     → Supabase UUID (user_id), the FK for all cloud data rows
 *   - authStore.sessionStatus → wait for 'authenticated' or 'unauthenticated' before making cloud requests
 */

import { create } from 'zustand';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

export interface AuthUser {
  id: string;        // Supabase user UUID — the primary key for all cloud data
  email: string;
  createdAt: string; // ISO 8601
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  sessionStatus: SessionStatus;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setSessionStatus: (status: SessionStatus) => void;
  signOut: () => Promise<void>;
}

/* ─────────────────────────────────────────────
   Store
   ───────────────────────────────────────────── */

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  sessionStatus: 'loading',

  setUser: (user) => set({ user }),

  setSessionStatus: (sessionStatus) => set({ sessionStatus }),

  signOut: async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Clear local state immediately (onAuthStateChange will also fire, but we
    // update synchronously so the UI responds without waiting for the event)
    set({ user: null, sessionStatus: 'unauthenticated' });
  },
}));

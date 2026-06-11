'use client';

/**
 * useAuthGate — Hook for action-level auth gating.
 *
 * Usage:
 *   const { guard, modalProps } = useAuthGate('translate');
 *
 *   // In the button click handler:
 *   guard(() => doTranslate());
 *
 *   // In JSX:
 *   <LoginModal {...modalProps} />
 *
 * Behaviour per PRD §7.1 state machine:
 *   - 'loading':          short-circuit (button stays disabled)
 *   - 'authenticated':    execute the action immediately
 *   - 'unauthenticated':  open LoginModal, do NOT execute action
 *
 * The modal closes on user cancellation with zero side-effects.
 * On auth state change to 'authenticated' while modal is open → modal closes
 * and the pending action is executed (handles the "logged in another tab" case).
 *
 * NOTE: The "execute after login" feature is best-effort only.
 * Magic Link opens a new tab; the user must return to this tab manually.
 * Per PRD decision: we do NOT do cross-tab auto-resume in this release.
 * The modal simply stays open; once user is back and auth state is updated,
 * the pending action fires.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { TriggerSource } from '@/components/auth/LoginModal';

interface AuthGateResult {
  /** Call this instead of the original action handler */
  guard: (action: () => void) => void;
  /** Spread onto <LoginModal /> */
  modalProps: {
    visible: boolean;
    triggerSource: TriggerSource;
    onClose: () => void;
  };
}

export function useAuthGate(source: TriggerSource): AuthGateResult {
  const { sessionStatus } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const prevStatusRef = useRef(sessionStatus);

  // When sessionStatus transitions from unauthenticated/loading → authenticated
  // while the modal is open, execute the pending action and close the modal.
  useEffect(() => {
    const wasNotAuthenticated = prevStatusRef.current !== 'authenticated';
    const isNowAuthenticated = sessionStatus === 'authenticated';

    if (wasNotAuthenticated && isNowAuthenticated && modalVisible) {
      setModalVisible(false);
      if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        // Defer slightly so modal close animation completes first
        setTimeout(action, 300);
      }
    }

    prevStatusRef.current = sessionStatus;
  }, [sessionStatus, modalVisible]);

  function guard(action: () => void) {
    if (sessionStatus === 'loading') {
      // Button should be disabled while loading; do nothing
      return;
    }

    if (sessionStatus === 'authenticated') {
      action();
      return;
    }

    // unauthenticated → show modal, store action for post-login execution
    pendingActionRef.current = action;
    setModalVisible(true);
  }

  function handleClose() {
    setModalVisible(false);
    pendingActionRef.current = null;
  }

  return {
    guard,
    modalProps: {
      visible: modalVisible,
      triggerSource: source,
      onClose: handleClose,
    },
  };
}

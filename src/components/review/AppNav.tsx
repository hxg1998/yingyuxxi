'use client';

/**
 * AppNav — Shared navigation for all pages.
 *
 * Desktop: horizontal header with "首页" and "复习库" links + Badge.
 * Mobile: fixed bottom tab bar (shown via CSS at ≤767px).
 *
 * Auth integration (v0.6.0):
 *   - Desktop header right: AuthNavArea (Skeleton / login button / user menu)
 *   - Clicking "复习库" when unauthenticated opens LoginModal (source='review')
 *   - Clicking "复习库" when authenticated navigates normally
 *
 * todayDueCount is read lazily from localStorage on mount so this
 * component works even in pages that don't pre-fetch it.
 *
 * Host app required: @arco-themes/react-abcd2/theme.css (via globals.css)
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Badge } from '@arco-design/web-react';
import { IconHome, IconBook } from '@arco-design/web-react/icon';
import { getAllCards } from '@/lib/review-store';
import { countTodayDue } from '@/lib/srs';
import { useAuthStore } from '@/stores/authStore';
import AuthNavArea from '@/components/auth/AuthNavArea';
import LoginModal from '@/components/auth/LoginModal';

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [todayDue, setTodayDue] = useState(0);
  const { sessionStatus } = useAuthStore();
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  useEffect(() => {
    // Today-due count comes from the cloud; only fetch when authenticated.
    if (sessionStatus !== 'authenticated') {
      setTodayDue(0);
      return;
    }
    let cancelled = false;
    getAllCards().then((cards) => {
      if (!cancelled) setTodayDue(countTodayDue(cards));
    });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  const isHome = pathname === '/';
  const isReview = pathname.startsWith('/review');

  function goHome() {
    router.push('/');
  }

  function handleGoReview() {
    if (sessionStatus === 'loading') {
      // Prevent click while session is still resolving
      return;
    }
    if (sessionStatus === 'unauthenticated') {
      setReviewModalVisible(true);
      return;
    }
    router.push('/review');
  }

  function handleReviewModalClose() {
    setReviewModalVisible(false);
  }

  return (
    <>
      {/* ── Desktop header ── */}
      <header
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-3) var(--spacing-6)',
          borderBottom: '1px solid var(--color-border-2)',
          background: 'var(--color-bg-2)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
        className="app-header-desktop"
      >
        <span
          style={{
            fontSize: 'var(--font-size-title-3)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-1)',
            cursor: 'pointer',
          }}
          onClick={goHome}
        >
          WordCard
        </span>

        <nav style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
          <button
            onClick={goHome}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--border-radius-medium)',
              fontSize: 'var(--font-size-body-1)',
              color: isHome ? 'var(--color-primary-6)' : 'var(--color-text-2)',
              fontWeight: isHome ? 'var(--font-weight-medium)' : 'var(--font-weight-regular)',
            }}
          >
            首页
          </button>

          <button
            onClick={handleGoReview}
            style={{
              background: 'none',
              border: 'none',
              cursor: sessionStatus === 'loading' ? 'default' : 'pointer',
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--border-radius-medium)',
              fontSize: 'var(--font-size-body-1)',
              color: isReview ? 'var(--color-primary-6)' : 'var(--color-text-2)',
              fontWeight: isReview ? 'var(--font-weight-medium)' : 'var(--font-weight-regular)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
              opacity: sessionStatus === 'loading' ? 0.5 : 1,
            }}
          >
            <Badge
              count={todayDue}
              maxCount={99}
              style={{ background: 'var(--color-badge-review)' }}
            >
              <span style={{ paddingRight: todayDue > 0 ? 'var(--spacing-3)' : 0 }}>
                复习库
              </span>
            </Badge>
          </button>
        </nav>

        {/* Auth nav area — right side */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <AuthNavArea />
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <div className="mobile-tab-bar">
        <button className={`mobile-tab-item${isHome ? ' active' : ''}`} onClick={goHome}>
          <IconHome style={{ fontSize: 20 }} />
          <span>首页</span>
        </button>

        <button
          className={`mobile-tab-item${isReview ? ' active' : ''}`}
          onClick={handleGoReview}
        >
          <Badge
            count={todayDue}
            maxCount={99}
            style={{ background: 'var(--color-badge-review)' }}
          >
            <IconBook style={{ fontSize: 20 }} />
          </Badge>
          <span>复习库</span>
        </button>
      </div>

      {/* ── Login modal for review gate (nav) ── */}
      <LoginModal
        visible={reviewModalVisible}
        triggerSource="review"
        onClose={handleReviewModalClose}
      />
    </>
  );
}

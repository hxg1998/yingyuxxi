'use client';

/**
 * /auth/error — Shown when the Magic Link callback fails (token expired/invalid).
 * Per DESIGN-login §10, uses Arco Result component (full-page error state).
 */

import { useRouter } from 'next/navigation';
import { Result, Button } from '@arco-design/web-react';

export default function AuthErrorPage() {
  const router = useRouter();

  function handleRetry() {
    // Navigate back to homepage; user can click translate / review to open the modal
    router.push('/');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-1)',
        padding: 'var(--spacing-6)',
      }}
    >
      <Result
        status="error"
        title="登录链接已失效"
        subTitle="链接可能已超时或已被使用，请重新发送登录链接"
        extra={
          <Button type="primary" onClick={handleRetry}>
            重新登录
          </Button>
        }
      />
    </div>
  );
}

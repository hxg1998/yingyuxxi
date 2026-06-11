'use client';

/**
 * AuthNavArea — Right-side nav area that renders three states:
 *
 *   'loading'          → Skeleton placeholder (prevents flash of login button)
 *   'unauthenticated'  → "登录 / 注册" Button
 *   'authenticated'    → UserMenu (avatar + email + dropdown)
 *
 * Placed at the far right of the desktop header and top-right of the
 * mobile header. The LoginModal state is owned here so it can be opened
 * from the nav button independently of page-level triggers.
 */

import { useState } from 'react';
import { Button, Skeleton } from '@arco-design/web-react';
import { useAuthStore } from '@/stores/authStore';
import LoginModal from './LoginModal';
import UserMenu from './UserMenu';

export default function AuthNavArea() {
  const { sessionStatus } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);

  if (sessionStatus === 'loading') {
    return (
      <Skeleton
        text={{ rows: 1, width: 80 }}
        animation
        style={{ display: 'flex', alignItems: 'center' }}
      />
    );
  }

  if (sessionStatus === 'authenticated') {
    return <UserMenu />;
  }

  // unauthenticated
  return (
    <>
      <Button
        type="primary"
        size="default"
        onClick={() => setModalVisible(true)}
        style={{ fontWeight: 'var(--font-weight-medium)' }}
      >
        登录 / 注册
      </Button>

      <LoginModal
        visible={modalVisible}
        triggerSource="nav"
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

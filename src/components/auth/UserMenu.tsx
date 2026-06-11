'use client';

/**
 * UserMenu — Logged-in user identifier in the nav bar.
 *
 * Desktop (≥768px): Avatar + truncated email + dropdown arrow
 *   Dropdown shows full email (disabled) + sign-out item
 *
 * Mobile (≤767px): Avatar only. Tap opens a right-side Drawer.
 *
 * Sign-out flow per DESIGN-login §6.3:
 *   - authStore.signOut() → clears session + cookie
 *   - Message.success("已退出登录")
 *   - If on /review route → router.push('/')
 */

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Avatar,
  Dropdown,
  Menu,
  Space,
  Typography,
  Drawer,
  Button,
  Message,
} from '@arco-design/web-react';
import { IconDown } from '@arco-design/web-react/icon';
import { useAuthStore } from '@/stores/authStore';

function truncateEmail(email: string, maxLen = 15): string {
  if (email.length <= maxLen) return email;
  return email.slice(0, maxLen) + '...';
}

function getInitial(email: string): string {
  return email.charAt(0).toUpperCase();
}

export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);

  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    Message.success({ content: '已退出登录', duration: 2000 });
    if (pathname.startsWith('/review')) {
      router.push('/');
    }
    setDrawerVisible(false);
  }

  const avatarEl = (
    <Avatar
      size={24}
      style={{ background: 'var(--color-primary-6)', cursor: 'pointer', flexShrink: 0 }}
    >
      {getInitial(user.email)}
    </Avatar>
  );

  /* ── Dropdown menu (desktop) ── */
  const dropdownMenu = (
    <Menu>
      <Menu.Item key="email" disabled style={{ cursor: 'default' }}>
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-2)',
            color: 'var(--color-text-3)',
          }}
        >
          {user.email}
        </Typography.Text>
      </Menu.Item>
      <Menu.Item
        key="signout"
        onClick={handleSignOut}
        style={{ color: 'var(--color-danger-6)' }}
      >
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      {/* Desktop: full label with dropdown */}
      <div className="auth-user-desktop">
        <Dropdown
          droplist={dropdownMenu}
          trigger={['click']}
          position="br"
        >
          <Space
            align="center"
            size={6}
            style={{ cursor: 'pointer' }}
          >
            {avatarEl}
            <Typography.Text
              style={{
                fontSize: 'var(--font-size-body-2)',
                color: 'var(--color-text-1)',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {truncateEmail(user.email)}
            </Typography.Text>
            <IconDown
              style={{
                color: 'var(--color-text-3)',
                fontSize: 10,
              }}
            />
          </Space>
        </Dropdown>
      </div>

      {/* Mobile: avatar only, opens Drawer */}
      <div className="auth-user-mobile">
        <div onClick={() => setDrawerVisible(true)}>
          {avatarEl}
        </div>
        <Drawer
          visible={drawerVisible}
          onCancel={() => setDrawerVisible(false)}
          placement="right"
          width={240}
          title="账号"
          footer={null}
        >
          <div style={{ padding: 'var(--spacing-2) 0' }}>
            <Typography.Text
              style={{
                display: 'block',
                fontSize: 'var(--font-size-body-2)',
                color: 'var(--color-text-3)',
                marginBottom: 'var(--spacing-4)',
                wordBreak: 'break-all',
              }}
            >
              {user.email}
            </Typography.Text>
            <Button
              type="outline"
              status="danger"
              long
              onClick={handleSignOut}
            >
              退出登录
            </Button>
          </div>
        </Drawer>
      </div>
    </>
  );
}

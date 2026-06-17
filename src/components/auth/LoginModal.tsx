'use client';

/**
 * LoginModal — Magic Link login modal.
 *
 * Three internal states: 'input' → 'sending' → 'sent'
 * Error states ('validation' / 'send_error') live alongside 'input'.
 *
 * triggerSource controls the title and hint text per DESIGN-login §5.1.
 * The modal never closes automatically — only via user action (× / mask click).
 */

import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Input,
  Button,
  Typography,
  Divider,
  Tag,
  Space,
} from '@arco-design/web-react';
import { IconEmail } from '@arco-design/web-react/icon';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

export type TriggerSource = 'translate' | 'review' | 'nav';

type ModalPhase = 'input' | 'sending' | 'sent';

interface LoginModalProps {
  visible: boolean;
  triggerSource: TriggerSource;
  onClose: () => void;
}

/* ─────────────────────────────────────────────
   Copy map (DESIGN-login §11)
   ───────────────────────────────────────────── */

const COPY: Record<TriggerSource, { title: string; hint: string }> = {
  translate: {
    title: '登录后查看翻译',
    hint: '你正在尝试翻译一个词，登录后即可继续',
  },
  review: {
    title: '登录后访问复习库',
    hint: '复习库需要登录才能访问，你的学习记录会云端同步',
  },
  nav: {
    title: '登录 / 注册 WordCard',
    hint: '登录后可跨设备同步你的复习库',
  },
};

/* ─────────────────────────────────────────────
   Email validation (DESIGN-login §5.4)
   ───────────────────────────────────────────── */

function validateEmail(email: string): string | null {
  if (!email.trim()) return '请输入邮箱地址';
  if (email.length > 100) return '邮箱地址过长';
  if (!email.includes('@') || !email.includes('.')) return '请输入有效的邮箱地址';
  // Basic RFC pattern: at least one char before @, domain with dot
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '请输入有效的邮箱地址';
  return null;
}

/* ─────────────────────────────────────────────
   Cooldown hook
   ───────────────────────────────────────────── */

function useCooldown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setSeconds(initialSeconds);
  }

  useEffect(() => {
    if (seconds <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  return { seconds, start };
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function LoginModal({ visible, triggerSource, onClose }: LoginModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('input');
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState('');
  const cooldown = useCooldown(60);

  const copy = COPY[triggerSource];

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPhase('input');
      setEmail('');
      setValidationError(null);
      setSendError(null);
      setSentEmail('');
    }
  }, [visible]);

  async function handleSend(emailToSend: string) {
    const error = validateEmail(emailToSend);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setSendError(null);
    setPhase('sending');

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setPhase('input');
      setSendError('Auth 服务未配置，请联系管理员');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error: supabaseError } = await supabase.auth.signInWithOtp({
      email: emailToSend.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (supabaseError) {
      setPhase('input');
      // Translate Supabase error messages to Chinese user-friendly text
      const msg = supabaseError.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setSendError('发送太频繁，请稍后再试');
      } else if (msg.includes('timeout') || msg.includes('network')) {
        setSendError('网络超时，请检查网络后重试');
      } else {
        setSendError('发送失败，请稍后重试');
      }
      return;
    }

    setSentEmail(emailToSend.trim());
    setPhase('sent');
    cooldown.start();
  }

  function handleResend() {
    handleSend(sentEmail);
  }

  function handleBackToInput() {
    setPhase('input');
    setEmail(sentEmail); // keep the email they typed
    setSendError(null);
    setValidationError(null);
  }

  /* ── Render: input + sending phase ── */
  const inputContent = (
    <div>
      {/* Trigger hint */}
      <div
        style={{
          background: 'var(--color-bg-3)',
          borderRadius: 'var(--border-radius-small)',
          padding: 'var(--spacing-2) var(--spacing-3)',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-2)',
            color: 'var(--color-text-3)',
            lineHeight: 1.6,
          }}
        >
          💡 {copy.hint}
        </Typography.Text>
      </div>

      {/* Subtitle */}
      <Typography.Text
        style={{
          display: 'block',
          fontSize: 'var(--font-size-body-1)',
          color: 'var(--color-text-2)',
          marginBottom: 'var(--spacing-4)',
          lineHeight: 1.6,
        }}
      >
        输入邮箱，我们发一封登录链接给你，无需密码
      </Typography.Text>

      {/* Email label + input */}
      <Typography.Text
        style={{
          display: 'block',
          fontSize: 'var(--font-size-body-2)',
          color: 'var(--color-text-2)',
          marginBottom: 'var(--spacing-1)',
        }}
      >
        邮箱地址
      </Typography.Text>
      <Input
        value={email}
        onChange={(v) => {
          setEmail(v);
          if (validationError) setValidationError(null);
          if (sendError) setSendError(null);
        }}
        onPressEnter={() => handleSend(email)}
        placeholder="your@email.com"
        type="email"
        maxLength={100}
        size="large"
        disabled={phase === 'sending'}
        status={validationError || sendError ? 'error' : undefined}
        style={{ width: '100%' }}
      />

      {/* Inline validation / send error */}
      {(validationError || sendError) && (
        <Typography.Text
          type="error"
          style={{
            display: 'block',
            marginTop: 'var(--spacing-1)',
            fontSize: 'var(--font-size-caption)',
          }}
        >
          {validationError || sendError}
        </Typography.Text>
      )}

      {/* Submit button */}
      <Button
        type="primary"
        size="large"
        long
        loading={phase === 'sending'}
        onClick={() => handleSend(email)}
        style={{ marginTop: 'var(--spacing-4)' }}
      >
        {phase === 'sending' ? '发送中...' : '发送登录链接'}
      </Button>

      {/* Disclaimer */}
      <div style={{ marginTop: 'var(--spacing-3)', textAlign: 'center' }}>
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-3)',
            color: 'var(--color-text-3)',
            display: 'block',
            lineHeight: 1.6,
          }}
        >
          首次使用将自动创建账号
        </Typography.Text>
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-3)',
            color: 'var(--color-text-3)',
          }}
        >
          继续即代表同意服务条款与隐私政策
        </Typography.Text>
      </div>

      {/* Divider + WeChat placeholder */}
      <Divider style={{ margin: 'var(--spacing-4) 0' }} />
      <Button
        disabled
        type="secondary"
        long
        style={{
          color: 'var(--color-text-3)',
          fontSize: 'var(--font-size-body-3)',
          background: 'var(--color-bg-3)',
          border: 'none',
          cursor: 'default',
        }}
      >
        微信登录（即将支持）
      </Button>
    </div>
  );

  /* ── Render: sent phase ── */
  const sentContent = (
    <div style={{ textAlign: 'center' }}>
      {/* Envelope icon */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <IconEmail
          style={{
            fontSize: 40,
            color: 'var(--color-primary-6)',
          }}
        />
      </div>

      {/* Description */}
      <Typography.Text
        style={{
          display: 'block',
          fontSize: 'var(--font-size-body-1)',
          color: 'var(--color-text-2)',
          marginBottom: 'var(--spacing-2)',
        }}
      >
        我们已向
      </Typography.Text>

      {/* Email chip */}
      <div style={{ marginBottom: 'var(--spacing-2)' }}>
        <Tag
          style={{
            background: 'var(--color-bg-3)',
            border: '1px solid var(--color-border-2)',
            borderRadius: 'var(--border-radius-small)',
            padding: 'var(--spacing-1) var(--spacing-3)',
            fontSize: 'var(--font-size-body-2)',
            color: 'var(--color-text-1)',
          }}
        >
          {sentEmail}
        </Tag>
      </div>

      <Typography.Text
        style={{
          display: 'block',
          fontSize: 'var(--font-size-body-1)',
          color: 'var(--color-text-2)',
          marginBottom: 'var(--spacing-3)',
        }}
      >
        发送了登录链接
      </Typography.Text>

      {/* Validity note */}
      <Typography.Text
        style={{
          display: 'block',
          fontSize: 'var(--font-size-body-3)',
          color: 'var(--color-text-3)',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        链接 15 分钟内有效 · 可能在垃圾邮件箱
      </Typography.Text>

      {/* Resend button */}
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Button
          type="outline"
          long
          disabled={cooldown.seconds > 0}
          onClick={handleResend}
        >
          {cooldown.seconds > 0
            ? `重新发送（${cooldown.seconds}s 后可发）`
            : '重新发送'}
        </Button>

        {/* Back to input */}
        <Button
          type="text"
          long
          onClick={handleBackToInput}
          style={{ color: 'var(--color-text-3)' }}
        >
          返回，更换邮箱
        </Button>
      </Space>
    </div>
  );

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      maskClosable={true}
      title={phase === 'sent' ? '查收邮件，点击链接登录' : copy.title}
      style={{ width: 400, maxWidth: 'calc(100vw - 40px)' }}
    >
      <div style={{ padding: '0 var(--spacing-2)' }}>
        {phase === 'sent' ? sentContent : inputContent}
      </div>
    </Modal>
  );
}

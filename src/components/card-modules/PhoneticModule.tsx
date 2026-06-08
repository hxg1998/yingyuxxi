'use client';

import { Typography, Space } from '@arco-design/web-react';
import { InputType } from '@/types/card';

interface PhoneticModuleProps {
  ipa?: string | null;
  inputType: InputType;
}

/**
 * Module 2 — IPA phonetics.
 * Not rendered for sentence type.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function PhoneticModule({ ipa, inputType }: PhoneticModuleProps) {
  // sentence type: never render
  if (inputType === 'sentence') return null;
  // No IPA data
  if (!ipa) return null;

  return (
    <div
      style={{
        background: 'var(--color-bg-3)',
        borderRadius: 'var(--border-radius-medium)',
        padding: 'var(--spacing-3)',
      }}
    >
      <Space align="center" size={8}>
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-3)',
            color: 'var(--color-text-3)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          音标
        </Typography.Text>
        <Typography.Text
          code
          style={{
            fontSize: 'var(--font-size-body-1)',
            color: 'var(--color-text-2)',
          }}
        >
          {ipa}
        </Typography.Text>
      </Space>
    </div>
  );
}

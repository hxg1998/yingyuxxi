'use client';

import { Typography, Space } from '@arco-design/web-react';
import { InputType } from '@/types/card';

interface MeaningModuleProps {
  meaning: string;
  contextNote?: string | null;
  inputType: InputType;
}

/**
 * Module 1 — Chinese meaning.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function MeaningModule({ meaning, contextNote }: MeaningModuleProps) {
  return (
    <div>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-3)',
            color: 'var(--color-text-3)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          含义
        </Typography.Text>

        <Typography.Paragraph
          style={{
            fontSize: 'var(--font-size-title-3)',
            color: 'var(--color-text-1)',
            fontWeight: 'var(--font-weight-medium)',
            margin: 0,
          }}
        >
          {meaning}
        </Typography.Paragraph>

        {contextNote && (
          <Typography.Text
            style={{
              fontSize: 'var(--font-size-body-3)',
              color: 'var(--color-text-3)',
              display: 'block',
            }}
          >
            💡 {contextNote}
          </Typography.Text>
        )}
      </Space>
    </div>
  );
}

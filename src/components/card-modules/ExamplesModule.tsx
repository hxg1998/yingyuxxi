'use client';

import { Typography, Space, Tag } from '@arco-design/web-react';
import { ExampleItem } from '@/types/card';

interface ExamplesModuleProps {
  examples: ExampleItem[];
}

/**
 * Module 5 — Industry usage examples (1-2 items).
 * Each item has left accent border using example-item-card class from globals.css.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function ExamplesModule({ examples }: ExamplesModuleProps) {
  if (!examples || examples.length === 0) return null;

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Typography.Text
        style={{
          fontSize: 'var(--font-size-body-3)',
          color: 'var(--color-text-3)',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        例句
      </Typography.Text>

      {examples.map((ex, idx) => (
        <div key={idx} className="example-item-card">
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Typography.Paragraph
              style={{
                fontSize: 'var(--font-size-body-1)',
                color: 'var(--color-text-1)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {ex.english}
            </Typography.Paragraph>

            <Typography.Paragraph
              style={{
                fontSize: 'var(--font-size-body-2)',
                color: 'var(--color-text-2)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {ex.chinese}
            </Typography.Paragraph>

            {ex.context && (
              <Tag color="arcoblue" size="small">
                {ex.context}
              </Tag>
            )}
          </Space>
        </div>
      ))}
    </Space>
  );
}

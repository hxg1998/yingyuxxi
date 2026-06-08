'use client';

import { Skeleton } from '@arco-design/web-react';

/**
 * Skeleton screen during AI generation.
 * Layout matches CardResult to prevent layout shift on completion.
 * Host app required: import '@arco-themes/react-abcd2/index.less' (or CSS fallback in globals.css)
 */
export default function LoadingSkeleton() {
  return (
    <div
      style={{
        background: 'var(--color-bg-2)',
        borderRadius: 'var(--border-radius-large)',
        boxShadow: 'var(--shadow-2)',
        padding: 'var(--spacing-5)',
        marginTop: 'var(--spacing-6)',
      }}
    >
      {/* CardHeader area */}
      <Skeleton animation text={{ rows: 1, width: ['60%'] }} />
      <div style={{ marginTop: 'var(--spacing-2)' }}>
        <Skeleton animation text={{ rows: 1, width: ['20%'] }} />
      </div>

      {/* MeaningModule */}
      <div style={{ marginTop: 'var(--spacing-6)' }}>
        <Skeleton animation text={{ rows: 2, width: ['100%', '70%'] }} />
      </div>

      {/* PronunciationModule — large block for mixedPronunciation */}
      <div style={{ marginTop: 'var(--spacing-6)' }}>
        <Skeleton
          animation
          text={false}
          image={{
            shape: 'square',
            style: { width: '100%', height: 60, borderRadius: 'var(--border-radius-medium)' },
          }}
        />
        <div style={{ marginTop: 'var(--spacing-4)' }}>
          <Skeleton animation text={{ rows: 3, width: ['50%', '60%', '80%'] }} />
        </div>
      </div>

      {/* ExamplesModule */}
      <div style={{ marginTop: 'var(--spacing-6)' }}>
        <Skeleton animation text={{ rows: 4, width: ['90%', '65%', '85%', '50%'] }} />
      </div>
    </div>
  );
}

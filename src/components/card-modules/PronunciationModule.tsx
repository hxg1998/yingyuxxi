'use client';

import { Typography, Space } from '@arco-design/web-react';
import { PronunciationData, InputType } from '@/types/card';
import SpeakButton from '../shared/SpeakButton';

interface PronunciationModuleProps {
  pronunciation: PronunciationData;
  inputType: InputType;
  /** Original English text — spoken aloud by the tap-to-listen button. */
  speakText: string;
}

/**
 * Render the pure-Chinese reading line, bolding the stressed syllable.
 * Input: readingChinese="呃-赖恩-门特", stressed="赖恩"
 * The matching syllable gets the .accent-syllable highlight; others render plain.
 */
function renderReading(readingChinese: string, stressed: string) {
  const syllables = readingChinese.split('-');
  return syllables.map((syl, idx) => {
    const isStressed = stressed && syl.trim() === stressed.trim();
    return (
      <span key={idx} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
        {idx > 0 && (
          <span
            style={{
              color: 'var(--color-text-3)',
              margin: '0 var(--spacing-1)',
              fontWeight: 'var(--font-weight-regular)',
            }}
          >
            -
          </span>
        )}
        {isStressed ? (
          <span className="accent-syllable">{syl}</span>
        ) : (
          <span>{syl}</span>
        )}
      </span>
    );
  });
}

/**
 * Module 3 — How to say it (core differentiator).
 * Pure-Chinese reading line (largest font, warm bg) + tap-to-listen + plain-language tip.
 * English breakdown demoted to small secondary reference.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function PronunciationModule({ pronunciation, speakText }: PronunciationModuleProps) {
  const { readingChinese, stressedSyllable, howToRead, naturalBreakdown } = pronunciation;

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {/* Label */}
      <Typography.Text
        style={{
          fontSize: 'var(--font-size-body-3)',
          color: 'var(--color-text-3)',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        怎么读
      </Typography.Text>

      {/* readingChinese — core block, pure Chinese, largest font, warm bg, with listen button */}
      <div
        style={{
          background: 'var(--color-primary-1)',
          borderRadius: 'var(--border-radius-medium)',
          padding: 'var(--spacing-4) var(--spacing-5)',
          border: '1px solid var(--color-primary-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-3)',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-size-display-2, 28px)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-1)',
            lineHeight: 1.4,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {renderReading(readingChinese, stressedSyllable)}
        </div>
        <SpeakButton text={speakText} />
      </div>

      {/* howToRead — plain-language rhythm guidance, prominent */}
      <Typography.Text
        style={{
          fontSize: 'var(--font-size-body-2)',
          color: 'var(--color-text-2)',
          display: 'block',
          lineHeight: 1.7,
        }}
      >
        {howToRead}
      </Typography.Text>

      {/* naturalBreakdown — secondary reference, small + muted */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-3)',
            color: 'var(--color-text-4)',
            minWidth: 56,
          }}
        >
          英文拆读
        </Typography.Text>
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-3)',
            color: 'var(--color-text-3)',
          }}
        >
          {naturalBreakdown}
        </Typography.Text>
      </div>
    </Space>
  );
}

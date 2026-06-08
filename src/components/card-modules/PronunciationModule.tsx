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
 * Render the pure-Chinese reading line, highlighting the stressed syllable.
 *
 * Highlight rules (DESIGN.md §9):
 *   1. Exact match with stressedSyllable string (primary rule).
 *   2. Syllable is all-uppercase English (e.g. LINE, BACK, PRO) — auto accent.
 *      This handles cases where the AI returns uppercase segments and the
 *      stressedSyllable field doesn't precisely match the display form.
 *
 * Highlighted syllable: .accent-syllable class (--color-warning-6 text,
 * --color-warning-1 bg, --font-weight-bold).
 */
function renderReading(readingChinese: string, stressed: string) {
  const syllables = readingChinese.split('-');
  return syllables.map((syl, idx) => {
    const trimmed = syl.trim();
    // Rule 1: exact match with stressedSyllable
    const isStressedByMatch = stressed && trimmed === stressed.trim();
    // Rule 2: segment is all-uppercase English letters (auto-accent fallback)
    const isStressedByCase = /^[A-Z]+$/.test(trimmed);
    const isStressed = isStressedByMatch || isStressedByCase;

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
 *
 * All three input types (word / phrase / sentence) now render the SpeakButton.
 * Sentence type still suppresses naturalBreakdown (#D2) — only the pronunciation
 * button restriction is lifted (TTS API handles full sentences correctly).
 *
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function PronunciationModule({
  pronunciation,
  inputType,
  speakText,
}: PronunciationModuleProps) {
  const { readingChinese, stressedSyllable, howToRead, naturalBreakdown } = pronunciation;
  const isSentence = inputType === 'sentence';

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

      {/* readingChinese core block — warm bg, largest font, optional listen button */}
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
            fontSize: 'var(--font-size-display-2)',
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

        {/* All three types (word / phrase / sentence) get a SpeakButton — TTS API handles sentences fine */}
        <SpeakButton text={speakText} />
      </div>

      {/* howToRead — plain-language rhythm guidance */}
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

      {/* naturalBreakdown — secondary reference (#D2: not rendered for sentence) */}
      {!isSentence && naturalBreakdown && (
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
      )}
    </Space>
  );
}

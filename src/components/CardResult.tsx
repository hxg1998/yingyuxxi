'use client';

import { useState } from 'react';
import { Card, Typography, Tag, Divider, Button, Tooltip } from '@arco-design/web-react';
import { IconLink, IconCheck } from '@arco-design/web-react/icon';
import { CardData, InputType } from '@/types/card';
import MeaningModule from './card-modules/MeaningModule';
import PhoneticModule from './card-modules/PhoneticModule';
import PronunciationModule from './card-modules/PronunciationModule';
import ExamplesModule from './card-modules/ExamplesModule';
import CopyButton from './shared/CopyButton';

interface CardResultProps {
  data: CardData;
  inputType: InputType;
}

// Map inputType to Arco Tag color preset name (not a CSS color) and display label
// 'arcoblue' | 'green' | 'orange' are Arco Tag color preset identifiers, not CSS values
type ArcoTagColor = 'arcoblue' | 'green' | 'orange';
interface TagConfig { tagColor: ArcoTagColor; label: string }
const INPUT_TYPE_TAG: Record<InputType, TagConfig> = {
  word:     { tagColor: 'arcoblue', label: '单词' },
  phrase:   { tagColor: 'green',    label: '短语' },
  sentence: { tagColor: 'orange',   label: '短句' },
};

/**
 * Full card result container.
 * Renders 6 modules in order; some modules conditionally hidden based on inputType.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function CardResult({ data, inputType }: CardResultProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const tag = INPUT_TYPE_TAG[inputType] ?? INPUT_TYPE_TAG.word;

  async function handleShareLink() {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('[CardResult] Share link copy failed:', err);
    }
  }

  return (
    <div className="card-fade-in" style={{ marginTop: 'var(--spacing-6)' }}>
      <Card
        bordered={false}
        style={{
          background: 'var(--color-bg-2)',
          borderRadius: 'var(--border-radius-large)',
          boxShadow: 'var(--shadow-2)',
        }}
        bodyStyle={{ padding: 'var(--spacing-5)' }}
      >
        {/* CardHeader */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--spacing-3)',
          }}
        >
          <Typography.Title
            heading={4}
            style={{
              fontSize: 'var(--font-size-title-2)',
              color: 'var(--color-text-1)',
              margin: 0,
              flex: 1,
              wordBreak: 'break-word',
            }}
          >
            {data.originalInput}
          </Typography.Title>
          <Tag color={tag.tagColor} size="small">
            {tag.label}
          </Tag>
        </div>

        <Divider style={{ margin: 'var(--spacing-4) 0' }} />

        {/* Module 1: Meaning */}
        <MeaningModule
          meaning={data.meaning.main}
          contextNote={data.meaning.contextNote}
          inputType={inputType}
        />

        <Divider style={{ margin: 'var(--spacing-4) 0' }} />

        {/* Module 2: Phonetic (word/phrase only) */}
        {inputType !== 'sentence' && data.phonetic.ipa && (
          <>
            <PhoneticModule ipa={data.phonetic.ipa} inputType={inputType} />
            <Divider style={{ margin: 'var(--spacing-4) 0' }} />
          </>
        )}

        {/* Module 3: Pronunciation (always rendered) — tap-to-listen + real pronunciation live inside */}
        <PronunciationModule
          pronunciation={data.pronunciation}
          inputType={inputType}
          speakText={data.originalInput}
          originalText={data.originalInput}
        />

        <Divider style={{ margin: 'var(--spacing-4) 0' }} />

        {/* Module 4: Examples */}
        <ExamplesModule examples={data.examples} />

        {/* Bottom actions row — flex row, share left / copy right (#C12) */}
        <Divider style={{ margin: 'var(--spacing-4) 0' }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 'var(--spacing-3)',
          }}
        >
          <Tooltip content={linkCopied ? '链接已复制' : '复制分享链接'}>
            <Button
              type="text"
              icon={linkCopied ? <IconCheck /> : <IconLink />}
              onClick={handleShareLink}
            >
              分享链接
            </Button>
          </Tooltip>
          <CopyButton cardData={data} inputType={inputType} />
        </div>
      </Card>
    </div>
  );
}

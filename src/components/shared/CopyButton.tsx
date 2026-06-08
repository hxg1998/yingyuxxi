'use client';

import { useState } from 'react';
import { Button } from '@arco-design/web-react';
import { IconCopy, IconCheck } from '@arco-design/web-react/icon';
import { CardData, InputType } from '@/types/card';

interface CopyButtonProps {
  cardData: CardData;
  inputType: InputType;
}

function formatCardForCopy(data: CardData, inputType: InputType): string {
  const lines: string[] = [];

  lines.push(`【${data.originalInput}】`);
  lines.push(`含义：${data.meaning.main}`);
  if (data.meaning.contextNote) lines.push(`备注：${data.meaning.contextNote}`);
  lines.push('');
  if (data.phonetic.ipa && inputType !== 'sentence') {
    lines.push(`音标：${data.phonetic.ipa}`);
  }
  lines.push(`怎么读：${data.pronunciation.readingChinese}`);
  lines.push(`  读法：${data.pronunciation.howToRead}`);
  lines.push(`  英文拆读：${data.pronunciation.naturalBreakdown}`);
  lines.push('');
  lines.push('例句：');
  data.examples.forEach((ex, i) => {
    lines.push(`  ${i + 1}. ${ex.english}`);
    lines.push(`     ${ex.chinese}`);
  });

  return lines.join('\n');
}

/**
 * Copy card content to clipboard as plain text.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function CopyButton({ cardData, inputType }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = formatCardForCopy(cardData, inputType);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for HTTP environments
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[CopyButton] Copy failed:', err);
    }
  }

  return (
    <Button
      type="outline"
      icon={copied ? <IconCheck /> : <IconCopy />}
      status={copied ? 'success' : undefined}
      onClick={handleCopy}
    >
      {copied ? '已复制' : '复制卡片'}
    </Button>
  );
}

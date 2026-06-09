import { NextResponse } from 'next/server';
import { CardData } from '@/types/card';

/**
 * Development-only mock endpoint for testing CardResult rendering without an API key.
 * Returns a hardcoded "alignment" card.
 */
const MOCK_CARD: CardData = {
  originalInput: 'alignment',
  inputType: 'word',
  generatedAt: new Date().toISOString(),
  meaning: {
    main: '对齐、一致性；在 AI/产品语境中，指团队对目标和方向达成共识',
    contextNote: 'AI 语境中常用于描述模型价值观与人类意图一致，如 alignment training（对齐训练）',
  },
  phonetic: {
    ipa: '/əˈlaɪnmənt/',
  },
  pronunciation: {
    readingChinese: '呃-赖恩-门特',
    stressedSyllable: '赖恩',
    howToRead: '中间「赖恩」使劲、拖长，两头「呃」和「门特」轻声快快带过，别三个字一样用力。',
    naturalBreakdown: 'a-LINE-ment',
  },
  examples: [
    {
      english: 'We need to ensure alignment between the product team and engineering before the launch.',
      chinese: '我们需要在发布前确保产品团队和工程团队之间保持一致。',
      context: '产品讨论',
    },
    {
      english: 'The AI safety team focuses on alignment research to make models more predictable.',
      chinese: 'AI 安全团队专注于对齐研究，让模型的行为更可预期。',
      context: 'AI 研究',
    },
  ],
  audio: {
    url: 'https://dictionary.cambridge.org/dictionary/english/alignment',
    sourceLabel: '来自 Cambridge',
  },
};

export async function GET() {
  return NextResponse.json({ success: true, data: MOCK_CARD });
}

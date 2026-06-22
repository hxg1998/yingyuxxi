'use client';

/**
 * /review/session — Review session page (state machine: step1 → step2 → done).
 *
 * URL params:
 *   ?id=<cardId>  — single-card review (from list "复习该词")
 *   (no params)   — today's full queue (up to 20 cards)
 *
 * State machine:
 *   step1 (front side: original text + phonetic + TTS)
 *     → flip → step2 (full card + 3-grade scoring)
 *     → grade → next step1 or /review/done
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Typography,
  Progress,
  Card,
  Space,
  Modal,
  Message,
} from '@arco-design/web-react';
import { IconClose } from '@arco-design/web-react/icon';
import RealPronunciationButton from '@/components/shared/RealPronunciationButton';
import SpeakButton from '@/components/shared/SpeakButton';
import { getAllCards, getCard, updateCardSRS } from '@/lib/review-store';
import { ReviewCard } from '@/lib/review-store';
import { ReviewGrade, applyReview, previewNextInterval, formatInterval, getTodayQueue } from '@/lib/srs';

// ── renderReading (copied pattern from PronunciationModule) ───────
function renderReading(readingChinese: string, stressed: string) {
  const syllables = readingChinese.split('-');
  return syllables.map((syl, idx) => {
    const trimmed = syl.trim();
    const isStressedByMatch = stressed && trimmed === stressed.trim();
    const isStressedByCase = /^[A-Z]+$/.test(trimmed);
    const isStressed = isStressedByMatch || isStressedByCase;
    return (
      <span key={idx} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
        {idx > 0 && (
          <span style={{ color: 'var(--color-text-3)', margin: '0 var(--spacing-1)', fontWeight: 'var(--font-weight-regular)' }}>
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

// ── Session result shape ──────────────────────────────────────────
export interface SessionResult {
  total: number;
  clear: number;   // q=5
  fuzzy: number;   // q=3
  fail: number;    // q=0
}

// ── Inner component (reads search params) ─────────────────────────
function SessionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const singleId = searchParams.get('id');

  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [step, setStep] = useState<'step1' | 'step2'>('step1');
  const [grading, setGrading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [sessionResult, setSessionResult] = useState<SessionResult>({ total: 0, clear: 0, fuzzy: 0, fail: 0 });
  const [animKey, setAnimKey] = useState(0);

  // Load queue on mount (async — data comes from the cloud)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q: ReviewCard[];
      if (singleId) {
        const card = await getCard(singleId);
        q = card ? [card] : [];
      } else {
        const all = await getAllCards();
        q = getTodayQueue(all);
      }
      if (cancelled) return;
      if (q.length === 0) {
        Message.info({ content: '当前没有需要复习的词', duration: 2500 });
        router.replace('/review');
        return;
      }
      setQueue(q);
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCard = queue[currentIdx] ?? null;
  const totalCount = queue.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function handleFlip() {
    setStep('step2');
    setAnimKey((k) => k + 1);
  }

  async function handleGrade(q: ReviewGrade) {
    if (!currentCard || grading) return;
    setGrading(true);

    // Compute new SRS state and persist to the cloud (await so the write
    // completes before we possibly navigate away on the last card)
    const updates = applyReview(currentCard, q);
    await updateCardSRS(currentCard.id, updates);

    // Update session result
    const newResult = { ...sessionResult };
    newResult.total++;
    if (q === 5) newResult.clear++;
    else if (q === 3) newResult.fuzzy++;
    else newResult.fail++;
    setSessionResult(newResult);

    const newCompleted = completedCount + 1;
    setCompletedCount(newCompleted);

    if (currentIdx + 1 < totalCount) {
      // Next card
      setCurrentIdx((i) => i + 1);
      setStep('step1');
      setAnimKey((k) => k + 1);
      setGrading(false);
    } else {
      // All done — go to completion page
      const resultParam = encodeURIComponent(JSON.stringify(newResult));
      router.push(`/review/done?result=${resultParam}`);
    }
  }

  function handleExit() {
    Modal.confirm({
      title: '确定退出复习？',
      content: '当前进度不保存。已完成评分的词不受影响。',
      okText: '确定退出',
      cancelText: '继续复习',
      okButtonProps: { status: 'danger' } as Record<string, unknown>,
      onOk: () => router.back(),
    });
  }

  if (!currentCard) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography.Text type="secondary">加载中...</Typography.Text>
      </div>
    );
  }

  // Preview intervals for score buttons
  const previews = previewNextInterval(currentCard);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-3) var(--spacing-5)',
          borderBottom: '1px solid var(--color-border-2)',
          background: 'var(--color-bg-2)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-title-3)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-1)',
          }}
        >
          WordCard
        </Typography.Text>
        <Button
          type="text"
          icon={<IconClose />}
          status="danger"
          onClick={handleExit}
        >
          退出复习
        </Button>
      </div>

      {/* ── Progress ── */}
      <div
        className="page-outer"
        style={{
          maxWidth: 680,
          width: '100%',
          margin: '0 auto',
          paddingTop: 'var(--spacing-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          <Typography.Text
            style={{ fontSize: 'var(--font-size-body-2)', color: 'var(--color-text-3)' }}
          >
            {completedCount} / {totalCount}
          </Typography.Text>
        </div>
        <Progress
          percent={percent}
          showText={false}
          strokeWidth={4}
          color="var(--color-primary-6)"
        />
      </div>

      {/* ── Main content ── */}
      <div
        className="page-outer"
        style={{
          maxWidth: 680,
          width: '100%',
          margin: '0 auto',
          flex: 1,
          paddingTop: 'var(--spacing-6)',
          paddingBottom: step === 'step2' ? 120 : 'var(--spacing-8)',
        }}
      >
        {step === 'step1' ? (
          <Step1
            card={currentCard}
            animKey={animKey}
            onFlip={handleFlip}
          />
        ) : (
          <Step2
            card={currentCard}
            animKey={animKey}
            previews={previews}
            grading={grading}
            onGrade={handleGrade}
          />
        )}
      </div>
    </div>
  );
}

// ── Step 1: Front side ────────────────────────────────────────────
interface Step1Props {
  card: ReviewCard;
  animKey: number;
  onFlip: () => void;
}

function Step1({ card, animKey, onFlip }: Step1Props) {
  return (
    <div key={animKey} className="slide-in-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-6)' }}>
      {/* Word card */}
      <Card
        bordered={false}
        style={{
          background: 'var(--color-review-card-bg)',
          borderRadius: 'var(--border-radius-large)',
          boxShadow: 'var(--shadow-2)',
          width: '100%',
        }}
        bodyStyle={{ padding: 'var(--spacing-6)', textAlign: 'center' }}
      >
        <Typography.Title
          heading={2}
          style={{
            fontSize: 'var(--font-size-display-2)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-1)',
            marginBottom: 'var(--spacing-3)',
            wordBreak: 'break-word',
          }}
        >
          {card.originalText}
        </Typography.Title>

        {card.phonetic && (
          <Typography.Text
            style={{
              fontSize: 'var(--font-size-body-1)',
              color: 'var(--color-text-3)',
              fontFamily: 'monospace',
              display: 'block',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            {card.phonetic}
          </Typography.Text>
        )}

        <Space size={12} wrap style={{ justifyContent: 'center', width: '100%' }}>
          <SpeakButton text={card.ttsText} size="large" />
          <RealPronunciationButton
            key={card.id}
            word={card.originalText}
            inputType={card.inputType}
            size="large"
          />
        </Space>
      </Card>

      {/* Recall prompt */}
      <Typography.Text
        type="secondary"
        style={{ fontSize: 'var(--font-size-body-2)', textAlign: 'center' }}
      >
        先不要看答案，凭记忆回想这个词的意思和用法
      </Typography.Text>

      {/* Flip button */}
      <Button
        type="primary"
        size="large"
        long
        style={{ minHeight: 48 }}
        onClick={onFlip}
      >
        翻开卡片，看答案 ↓
      </Button>
    </div>
  );
}

// ── Step 2: Full card + scoring ───────────────────────────────────
interface Step2Props {
  card: ReviewCard;
  animKey: number;
  previews: Record<ReviewGrade, number>;
  grading: boolean;
  onGrade: (q: ReviewGrade) => void;
}

function Step2({ card, animKey, previews, grading, onGrade }: Step2Props) {
  const grades: Array<{ q: ReviewGrade; label: string; cls: string }> = [
    { q: 0, label: '❌ 完全不会', cls: 'score-btn-fail' },
    { q: 3, label: '△ 模糊记得', cls: 'score-btn-fuzzy' },
    { q: 5, label: '✓ 清楚记得', cls: 'score-btn-clear' },
  ];

  return (
    <div key={animKey} className="slide-in-right">
      {/* Full card content */}
      <Card
        bordered={false}
        style={{
          background: 'var(--color-review-card-bg)',
          borderRadius: 'var(--border-radius-large)',
          boxShadow: 'var(--shadow-2)',
          marginBottom: 'var(--spacing-4)',
        }}
        bodyStyle={{
          padding: 'var(--spacing-5)',
          maxHeight: 'calc(100vh - 280px)',
          overflowY: 'auto',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-3)' }}>
          <div style={{ flex: 1, marginRight: 'var(--spacing-2)', wordBreak: 'break-word' }}>
            <Typography.Title
              heading={4}
              style={{ fontSize: 'var(--font-size-title-3)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}
            >
              {card.originalText}
            </Typography.Title>
            {card.phonetic && (
              <Typography.Text style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-3)', fontFamily: 'monospace' }}>
                {card.phonetic}
              </Typography.Text>
            )}
          </div>
          <Space size={8} wrap style={{ flexShrink: 0, alignItems: 'center' }}>
            <SpeakButton text={card.ttsText} size="small" />
            <RealPronunciationButton
              key={card.id}
              word={card.originalText}
              inputType={card.inputType}
              size="small"
            />
          </Space>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border-2)', paddingTop: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
          {/* Meaning */}
          <Typography.Text
            style={{
              fontSize: 'var(--font-size-body-1)',
              color: 'var(--color-text-1)',
              display: 'block',
              marginBottom: 'var(--spacing-3)',
            }}
          >
            {card.meaning}
          </Typography.Text>

          {/* Reading section */}
          {card.readingChinese && (
            <div style={{ marginBottom: 'var(--spacing-3)' }}>
              <Typography.Text
                style={{ fontSize: 'var(--font-size-body-3)', color: 'var(--color-text-3)', fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 'var(--spacing-2)' }}
              >
                怎么读
              </Typography.Text>
              {/* readingChinese block */}
              <div
                style={{
                  background: 'var(--color-primary-1)',
                  borderRadius: 'var(--border-radius-medium)',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  border: '1px solid var(--color-primary-2)',
                  fontSize: 'var(--font-size-display-2)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-1)',
                  lineHeight: 1.4,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-2)',
                }}
              >
                {renderReading(card.readingChinese, card.stressedSyllable)}
              </div>
              {card.howToRead && (
                <Typography.Text style={{ fontSize: 'var(--font-size-body-2)', color: 'var(--color-text-2)', display: 'block', marginBottom: 'var(--spacing-1)' }}>
                  {card.howToRead}
                </Typography.Text>
              )}
              {card.naturalBreakdown && (
                <Typography.Text style={{ fontSize: 'var(--font-size-body-2)', color: 'var(--color-text-3)', display: 'block' }}>
                  英文拆读：{card.naturalBreakdown}
                </Typography.Text>
              )}
            </div>
          )}

          {/* Examples (max 2) */}
          {card.examples.length > 0 && (
            <div>
              <Typography.Text
                style={{ fontSize: 'var(--font-size-body-3)', color: 'var(--color-text-3)', fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 'var(--spacing-2)' }}
              >
                行业例句
              </Typography.Text>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {card.examples.slice(0, 2).map((ex, i) => (
                  <div key={i} className="example-item-card">
                    <Typography.Text style={{ fontSize: 'var(--font-size-body-1)', color: 'var(--color-text-1)', display: 'block' }}>
                      {ex.english}
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 'var(--font-size-body-2)', color: 'var(--color-text-2)', display: 'block', marginTop: 'var(--spacing-1)' }}>
                      {ex.chinese}
                    </Typography.Text>
                  </div>
                ))}
              </Space>
            </div>
          )}
        </div>
      </Card>

      {/* Score bar — sticky on mobile */}
      <div className="score-bar-sticky">
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-2)',
            color: 'var(--color-text-2)',
            display: 'block',
            marginBottom: 'var(--spacing-3)',
          }}
        >
          你刚才记住这个词了吗？
        </Typography.Text>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          {grades.map(({ q, label, cls }) => (
            <button
              key={q}
              className={cls}
              disabled={grading}
              onClick={() => onGrade(q)}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: 'var(--border-radius-medium)',
                borderWidth: 1,
                borderStyle: 'solid',
                background: 'transparent',
                cursor: grading ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-1)',
                fontSize: 'var(--font-size-body-2)',
                fontWeight: 'var(--font-weight-medium)',
                padding: 'var(--spacing-2)',
                transition: 'background 0.15s ease, transform 0.1s ease',
              }}
            >
              <span>{label}</span>
              <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-3)', fontWeight: 'var(--font-weight-regular)' }}>
                {formatInterval(previews[q])}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page export (wrapped in Suspense for useSearchParams) ─────────
export default function ReviewSessionPage() {
  return (
    <Suspense fallback={null}>
      <SessionInner />
    </Suspense>
  );
}

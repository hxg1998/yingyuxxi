'use client';

/**
 * /review/done — Review completion page.
 *
 * Receives session results via URL param `result` (JSON-encoded).
 * Shows this-session stats, tomorrow/day-after preview, and two action buttons.
 */

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Typography,
  Button,
  Space,
  Grid,
  Card,
} from '@arco-design/web-react';
import { getAllCards } from '@/lib/review-store';
import { countDueTomorrow, countDueDayAfterTomorrow } from '@/lib/srs';
import type { SessionResult } from '../session/page';

const { Row, Col } = Grid;

function DoneInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  let result: SessionResult = { total: 0, clear: 0, fuzzy: 0, fail: 0 };
  try {
    const raw = searchParams.get('result');
    if (raw) result = JSON.parse(decodeURIComponent(raw));
  } catch {
    // Use defaults
  }

  const allCards = getAllCards();
  const tomorrowCount = countDueTomorrow(allCards);
  const dayAfterCount = countDueDayAfterTomorrow(allCards);

  const stats = [
    {
      title: '本次复习',
      value: result.total,
      color: 'var(--color-text-1)',
    },
    {
      title: '✓ 会了',
      value: result.clear,
      color: 'var(--color-score-clear-text)',
    },
    {
      title: '△ 模糊',
      value: result.fuzzy,
      color: 'var(--color-score-fuzzy-text)',
    },
    {
      title: '❌ 不会',
      value: result.fail,
      color: 'var(--color-score-fail-text)',
    },
  ];

  return (
    <div
      className="page-outer card-fade-in"
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'var(--spacing-10)',
        paddingBottom: 'var(--spacing-10)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680 }}>
        {/* Title */}
        <Typography.Title
          heading={3}
          style={{
            textAlign: 'center',
            marginBottom: 'var(--spacing-6)',
            fontSize: 'var(--font-size-title-2)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          今日复习完成！
        </Typography.Title>

        {/* 4-grid stats */}
        <Row gutter={12} style={{ marginBottom: 'var(--spacing-5)' }}>
          {stats.map((s, i) => (
            <Col
              span={12}
              xs={12}
              sm={6}
              key={i}
              style={{ marginBottom: 12 }}
            >
              <div
                style={{
                  background: 'var(--color-bg-2)',
                  borderRadius: 'var(--border-radius-medium)',
                  padding: 'var(--spacing-4)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--font-size-title-2)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: s.color,
                    lineHeight: 1.2,
                    marginBottom: 'var(--spacing-1)',
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-text-3)',
                  }}
                >
                  {s.title}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Tomorrow/day-after preview */}
        <Card
          bordered={false}
          style={{
            background: 'var(--color-bg-3)',
            borderRadius: 'var(--border-radius-medium)',
            marginBottom: 'var(--spacing-6)',
          }}
          bodyStyle={{ padding: 'var(--spacing-4) var(--spacing-5)' }}
        >
          <Space direction="vertical" size={8}>
            {tomorrowCount > 0 && (
              <Typography.Text style={{ fontSize: 'var(--font-size-body-1)', color: 'var(--color-text-2)' }}>
                📅 明天到期：{tomorrowCount} 个词
              </Typography.Text>
            )}
            {dayAfterCount > 0 && (
              <Typography.Text style={{ fontSize: 'var(--font-size-body-1)', color: 'var(--color-text-2)' }}>
                📅 后天到期：{dayAfterCount} 个词
              </Typography.Text>
            )}
            {tomorrowCount === 0 && dayAfterCount === 0 && (
              <Typography.Text style={{ fontSize: 'var(--font-size-body-1)', color: 'var(--color-text-2)' }}>
                近两天暂无待复习词，继续学习新词吧！
              </Typography.Text>
            )}
          </Space>
        </Card>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-4)',
            flexWrap: 'wrap',
          }}
        >
          <Button
            type="outline"
            size="large"
            style={{ flex: 1, minWidth: 140 }}
            onClick={() => router.push('/review')}
          >
            查看复习库
          </Button>
          <Button
            type="primary"
            size="large"
            style={{ flex: 1, minWidth: 140 }}
            onClick={() => router.push('/')}
          >
            再查一个词
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewDonePage() {
  return (
    <Suspense fallback={null}>
      <DoneInner />
    </Suspense>
  );
}

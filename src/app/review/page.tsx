'use client';

/**
 * /review — Review Library list page (v0.7.0).
 *
 * Data source migrated from localStorage to Supabase cloud.
 * All review-store calls are now async — a loading spinner is shown
 * while the initial fetch completes.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Typography,
  Button,
  Input,
  Tabs,
  Tag,
  Grid,
  Modal,
  Message,
  Select,
  Empty,
  Spin,
} from '@arco-design/web-react';
import {
  IconDownload,
  IconSearch,
  IconPlayCircle,
} from '@arco-design/web-react/icon';
import AppNav from '@/components/review/AppNav';
import {
  getAllCards,
  markMastered,
  exportAllData,
} from '@/lib/review-store';
import { ReviewCard } from '@/lib/review-store';
import { countTodayDue, formatDueDate, getTodayQueue, countDueTomorrow } from '@/lib/srs';

type FilterTab = 'all' | 'due' | 'mastered' | 'hard';
type SortKey = 'dueDate' | 'createdAt' | 'lastReviewDate' | 'easeFactor';

const { Row, Col } = Grid;

export default function ReviewPage() {
  const router = useRouter();
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');

  // ── Load data ──────────────────────────────────────────────────
  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllCards();
      setCards(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // ── Derived stats ──────────────────────────────────────────────
  const todayDue = countTodayDue(cards);
  const totalCount = cards.length;
  const masteredCount = cards.filter((c) => c.mastered).length;
  const todayQueue = getTodayQueue(cards);
  const tomorrowCount = countDueTomorrow(cards);

  // ── Filtered + sorted list ─────────────────────────────────────
  const filteredCards = (() => {
    let result = [...cards];

    // Tab filter
    if (activeTab === 'due') {
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      result = result.filter((c) => !c.mastered && c.dueDate <= endOfToday.getTime());
    } else if (activeTab === 'mastered') {
      result = result.filter((c) => c.mastered);
    } else if (activeTab === 'hard') {
      result = result.filter((c) => c.totalLapses >= 3 || c.easeFactor < 1.8);
    }

    // Search
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.originalText.toLowerCase().includes(q) ||
          c.meaning.toLowerCase().includes(q),
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortKey) {
        case 'dueDate':
          return a.dueDate - b.dueDate;
        case 'createdAt':
          return b.createdAt - a.createdAt;
        case 'lastReviewDate': {
          const aTime = a.lastReviewDate ?? 0;
          const bTime = b.lastReviewDate ?? 0;
          return bTime - aTime;
        }
        case 'easeFactor':
          return a.easeFactor - b.easeFactor;
        default:
          return 0;
      }
    });

    return result;
  })();

  // ── Actions ────────────────────────────────────────────────────
  function handleStartReview() {
    if (todayQueue.length === 0) return;
    router.push('/review/session');
  }

  function handleReviewSingle(cardId: string) {
    router.push(`/review/session?id=${cardId}`);
  }

  function handleMarkMastered(card: ReviewCard) {
    Modal.confirm({
      title: `标记「${card.originalText}」为已掌握？`,
      content: '已掌握的词将移出日常复习队列，90天后会做一次抽查。',
      okText: '确认标记',
      cancelText: '取消',
      okButtonProps: { type: 'primary' } as Record<string, unknown>,
      onOk: async () => {
        const ok = await markMastered(card.id);
        if (ok) {
          Message.success({ content: '已标记为掌握', duration: 2000 });
          loadCards();
        } else {
          Message.error({ content: '操作失败，请重试', duration: 3000 });
        }
      },
    });
  }

  async function handleExport() {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `wordcard-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Message.success({ content: '备份文件已下载', duration: 2000 });
    } catch {
      Message.error({ content: '导出失败，请重试', duration: 3000 });
    }
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="has-tab-bar" style={{ background: 'var(--color-bg-1)', minHeight: '100vh' }}>
        <AppNav />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <Spin size={32} tip="加载中..." />
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────
  if (totalCount === 0) {
    return (
      <div className="has-tab-bar" style={{ background: 'var(--color-bg-1)', minHeight: '100vh' }}>
        <AppNav />
        <div
          className="page-outer"
          style={{
            maxWidth: 680,
            margin: '0 auto',
            paddingTop: 'var(--spacing-10)',
            paddingBottom: 'var(--spacing-10)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 'var(--spacing-6)',
            }}
          >
            <Typography.Title heading={4} style={{ margin: 0, fontSize: 'var(--font-size-title-2)', fontWeight: 'var(--font-weight-semibold)' }}>
              复习库
            </Typography.Title>
          </div>
          <Empty
            description="还没有保存任何卡片"
          />
          <div style={{ marginTop: 'var(--spacing-2)', textAlign: 'center' }}>
            <Typography.Text type="secondary" style={{ fontSize: 'var(--font-size-body-2)', display: 'block', marginBottom: 'var(--spacing-4)' }}>
              查一个词，卡片会自动保存到这里
            </Typography.Text>
            <Button type="primary" onClick={() => router.push('/')}>
              去查第一个词
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tag color for due date ─────────────────────────────────────
  function dueDateTag(card: ReviewCard) {
    if (card.mastered) {
      return <Tag color="green" size="small">已掌握</Tag>;
    }
    const { label, urgency } = formatDueDate(card.dueDate);
    const color = urgency === 'today' ? 'red' : urgency === 'tomorrow' ? 'orange' : 'arcoblue';
    return <Tag color={color} size="small">{label}到期</Tag>;
  }

  const hardCount = cards.filter((c) => c.totalLapses >= 3 || c.easeFactor < 1.8).length;

  return (
    <div className="has-tab-bar" style={{ background: 'var(--color-bg-1)', minHeight: '100vh' }}>
      <AppNav />

      <div
        className="page-outer"
        style={{ maxWidth: 680, margin: '0 auto', paddingTop: 'var(--spacing-6)', paddingBottom: 'var(--spacing-10)' }}
      >
        {/* Page title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-5)',
          }}
        >
          <Typography.Title
            heading={4}
            style={{ margin: 0, fontSize: 'var(--font-size-title-2)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            复习库
          </Typography.Title>
          <Button
            type="outline"
            icon={<IconDownload />}
            size="small"
            onClick={handleExport}
          >
            导出 JSON
          </Button>
        </div>

        {/* Today's review queue card */}
        <div className="review-queue-card" style={{ marginBottom: 'var(--spacing-5)' }}>
          {todayQueue.length > 0 ? (
            <>
              <Typography.Text
                style={{
                  fontSize: 'var(--font-size-body-3)',
                  color: 'var(--color-text-3)',
                  display: 'block',
                  marginBottom: 'var(--spacing-2)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                今日复习队列
              </Typography.Text>
              <Typography.Text
                style={{ fontSize: 'var(--font-size-body-1)', color: 'var(--color-text-2)', display: 'block', marginBottom: 'var(--spacing-4)' }}
              >
                今天有{' '}
                <span
                  style={{
                    fontSize: 'var(--font-size-title-2)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-stats-value)',
                  }}
                >
                  {todayDue}
                </span>{' '}
                个词到期，需要复习
              </Typography.Text>
              <Button type="primary" size="large" long onClick={handleStartReview}>
                立即开始复习
              </Button>
            </>
          ) : (
            <>
              <Typography.Text
                style={{
                  fontSize: 'var(--font-size-body-1)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-1)',
                  display: 'block',
                  marginBottom: 'var(--spacing-2)',
                }}
              >
                今天的复习已完成！
              </Typography.Text>
              {tomorrowCount > 0 && (
                <Typography.Text style={{ fontSize: 'var(--font-size-body-1)', color: 'var(--color-text-2)' }}>
                  明天还有 {tomorrowCount} 个词到期
                </Typography.Text>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <Row gutter={12} style={{ marginBottom: 'var(--spacing-5)' }}>
          {[
            { title: '总词数', value: totalCount },
            { title: '已掌握', value: masteredCount },
            { title: '今日到期', value: todayDue },
          ].map((s) => (
            <Col span={8} key={s.title}>
              <div
                style={{
                  background: 'var(--color-bg-2)',
                  borderRadius: 'var(--border-radius-medium)',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--font-size-title-2)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-stats-value)',
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-text-3)',
                    marginTop: 'var(--spacing-1)',
                  }}
                >
                  {s.title}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Search + Sort */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-3)',
            alignItems: 'center',
            marginBottom: 'var(--spacing-3)',
          }}
        >
          <Input
            prefix={<IconSearch />}
            placeholder="搜索单词..."
            allowClear
            value={searchText}
            onChange={(v) => setSearchText(v)}
            style={{ flex: 1 }}
          />
          <Select
            value={sortKey}
            onChange={(v) => setSortKey(v as SortKey)}
            size="small"
            style={{ width: 110 }}
          >
            <Select.Option value="dueDate">最快到期</Select.Option>
            <Select.Option value="createdAt">最近添加</Select.Option>
            <Select.Option value="lastReviewDate">最近复习</Select.Option>
            <Select.Option value="easeFactor">难度</Select.Option>
          </Select>
        </div>

        {/* Filter tabs */}
        <Tabs
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as FilterTab)}
          type="rounded"
          style={{ marginBottom: 'var(--spacing-4)' }}
        >
          <Tabs.TabPane key="all" title={`全部(${totalCount})`} />
          <Tabs.TabPane key="due" title={`今日到期(${todayDue})`} />
          <Tabs.TabPane key="mastered" title={`已掌握(${masteredCount})`} />
          <Tabs.TabPane key="hard" title={`需加强(${hardCount})`} />
        </Tabs>

        {/* List */}
        {filteredCards.length === 0 ? (
          <div style={{ paddingTop: 'var(--spacing-8)', textAlign: 'center' }}>
            <Typography.Text type="secondary">没有符合条件的词</Typography.Text>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--color-bg-2)',
              borderRadius: 'var(--border-radius-medium)',
              overflow: 'hidden',
            }}
          >
            {filteredCards.map((card, idx) => (
              <div
                key={card.id}
                style={{
                  padding: 'var(--spacing-4) var(--spacing-5)',
                  borderBottom: idx < filteredCards.length - 1 ? '1px solid var(--color-border-2)' : 'none',
                }}
              >
                {/* Top row: word + phonetic + meaning */}
                <div style={{ marginBottom: 'var(--spacing-2)' }}>
                  <span
                    style={{
                      fontSize: 'var(--font-size-title-3)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-1)',
                      marginRight: 'var(--spacing-2)',
                    }}
                  >
                    {card.originalText}
                  </span>
                  {card.phonetic && (
                    <span
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--color-text-3)',
                        fontFamily: 'monospace',
                        marginRight: 'var(--spacing-2)',
                      }}
                    >
                      {card.phonetic}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 'var(--font-size-body-2)',
                      color: 'var(--color-text-2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '50%',
                      display: 'inline-block',
                      verticalAlign: 'middle',
                    }}
                  >
                    {card.meaning}
                  </span>
                </div>

                {/* Second row: tag + review count */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    marginBottom: 'var(--spacing-3)',
                  }}
                >
                  {dueDateTag(card)}
                  <Typography.Text
                    style={{ fontSize: 'var(--font-size-body-3)', color: 'var(--color-text-3)' }}
                  >
                    · 复习 {card.totalReviews} 次
                  </Typography.Text>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end' }}>
                  <Button
                    type="text"
                    size="small"
                    icon={<IconPlayCircle />}
                    onClick={() => handleReviewSingle(card.id)}
                  >
                    复习该词
                  </Button>
                  {!card.mastered && (
                    <Button
                      type="text"
                      size="small"
                      status="warning"
                      onClick={() => handleMarkMastered(card)}
                    >
                      标记掌握
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note — data is now cloud-backed */}
        <div
          style={{
            marginTop: 'var(--spacing-6)',
            paddingTop: 'var(--spacing-4)',
            borderTop: '1px solid var(--color-border-2)',
          }}
        >
          <Typography.Text
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-3)',
            }}
          >
            数据已云端同步，绑定当前账户。
          </Typography.Text>
        </div>
      </div>
    </div>
  );
}

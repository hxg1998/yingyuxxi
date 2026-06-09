/**
 * srs.ts — SM-2 Spaced Repetition Scheduling Engine (v0.4.0)
 *
 * Three-grade scoring:
 *   q = 0  "完全不会" — complete blank
 *   q = 3  "模糊记得" — vague recall
 *   q = 5  "清楚记得" — clear recall
 *
 * Rules per PRD/11-review-library.md §SM-2 调度规则.
 */

import { ReviewCard } from './review-store';

export type ReviewGrade = 0 | 3 | 5;

export interface SRSUpdate {
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: number;
  lastReviewDate: number;
  totalReviews: number;
  totalLapses: number;
}

/** Midnight (00:00:00.000) of today, local time. */
function todayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculate the next SRS state after a review.
 *
 * @param card  Current card state (read from localStorage)
 * @param q     Review grade: 0 | 3 | 5
 * @returns     Partial card update to write back to storage
 */
export function applyReview(card: ReviewCard, q: ReviewGrade): SRSUpdate {
  const now = Date.now();
  const today = todayMidnight();

  // Step 1: Update EF
  // New EF = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const newEF = Math.max(1.3, card.easeFactor + delta);

  // Step 2: Update interval + repetitions
  let newInterval: number;
  let newRepetitions: number;

  if (q === 0) {
    // Complete blank — reset
    newRepetitions = 0;
    newInterval = 1;
  } else if (q === 3) {
    // Vague — reset progress but don't count as lapse
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // q === 5 — clear recall
    if (card.repetitions === 0) {
      newInterval = 1;
    } else if (card.repetitions === 1) {
      newInterval = 6;
    } else {
      // Use the NEW EF (per PRD note)
      newInterval = Math.round(card.interval * newEF);
    }
    newRepetitions = card.repetitions + 1;
  }

  // Step 3: dueDate = today midnight + interval days
  const newDueDate = today + newInterval * MS_PER_DAY;

  // Step 4: other fields
  const newTotalReviews = card.totalReviews + 1;
  const newTotalLapses = q === 0 ? card.totalLapses + 1 : card.totalLapses;

  return {
    easeFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    dueDate: newDueDate,
    lastReviewDate: now,
    totalReviews: newTotalReviews,
    totalLapses: newTotalLapses,
  };
}

/**
 * Preview the next interval (in days) for each grade without mutating state.
 * Used by the scoring buttons to show "6天后复习" etc.
 */
export function previewNextInterval(card: ReviewCard): Record<ReviewGrade, number> {
  const preview = (q: ReviewGrade): number => {
    const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    const newEF = Math.max(1.3, card.easeFactor + delta);

    if (q === 0 || q === 3) return 1;

    // q === 5
    if (card.repetitions === 0) return 1;
    if (card.repetitions === 1) return 6;
    return Math.round(card.interval * newEF);
  };

  return { 0: preview(0), 3: preview(3), 5: preview(5) };
}

/**
 * Format an interval in days into a human-readable Chinese string.
 * e.g.  1 → "明天再复习"
 *       6 → "6天后复习"
 */
export function formatInterval(days: number): string {
  if (days <= 1) return '明天再复习';
  return `${days}天后复习`;
}

/* ─────────────────────────────────────────────
   Queue Calculation
   ───────────────────────────────────────────── */

const MAX_QUEUE_SIZE = 20;

/**
 * Return today's due review queue (up to 20 cards).
 *
 * Includes:
 *   1. Regular due cards: dueDate ≤ end of today, mastered = false
 *   2. Mastered spot-check: nextSpotCheckDate ≤ end of today, mastered = true
 *
 * Sorted by dueDate ascending (oldest overdue first).
 */
export function getTodayQueue(allCards: ReviewCard[]): ReviewCard[] {
  const now = new Date();
  // End of today (23:59:59.999)
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endMs = endOfToday.getTime();

  // Regular due cards
  const regularDue = allCards
    .filter((c) => !c.mastered && c.dueDate <= endMs)
    .sort((a, b) => a.dueDate - b.dueDate);

  // Mastered spot-checks
  const spotChecks = allCards
    .filter((c) => c.mastered && c.nextSpotCheckDate !== null && c.nextSpotCheckDate <= endMs)
    .sort((a, b) => (a.nextSpotCheckDate ?? 0) - (b.nextSpotCheckDate ?? 0));

  const combined = [...regularDue, ...spotChecks];
  return combined.slice(0, MAX_QUEUE_SIZE);
}

/**
 * Count cards due tomorrow (dueDate in [start of tomorrow, end of tomorrow]).
 */
export function countDueTomorrow(allCards: ReviewCard[]): number {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const startMs = tomorrow.getTime();
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;

  return allCards.filter((c) => !c.mastered && c.dueDate >= startMs && c.dueDate <= endMs).length;
}

/**
 * Count cards due the day after tomorrow.
 */
export function countDueDayAfterTomorrow(allCards: ReviewCard[]): number {
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(0, 0, 0, 0);
  const startMs = dayAfter.getTime();
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;

  return allCards.filter((c) => !c.mastered && c.dueDate >= startMs && c.dueDate <= endMs).length;
}

/**
 * Count today's due cards (for navigation badge).
 */
export function countTodayDue(allCards: ReviewCard[]): number {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endMs = endOfToday.getTime();

  const regular = allCards.filter((c) => !c.mastered && c.dueDate <= endMs).length;
  const spotCheck = allCards.filter(
    (c) => c.mastered && c.nextSpotCheckDate !== null && c.nextSpotCheckDate <= endMs,
  ).length;

  return regular + spotCheck;
}

/**
 * Format a dueDate timestamp to a relative label ("今天" / "明天" / "N天后").
 */
export function formatDueDate(dueDate: number): { label: string; urgency: 'today' | 'tomorrow' | 'later' } {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const endOfTomorrow = new Date(now);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
  endOfTomorrow.setHours(23, 59, 59, 999);

  if (dueDate <= endOfToday.getTime()) return { label: '今天', urgency: 'today' };
  if (dueDate <= endOfTomorrow.getTime()) return { label: '明天', urgency: 'tomorrow' };

  const diffDays = Math.ceil((dueDate - now.getTime()) / (24 * 60 * 60 * 1000));
  return { label: `${diffDays}天后`, urgency: 'later' };
}

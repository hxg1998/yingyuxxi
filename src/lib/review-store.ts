/**
 * review-store.ts — Supabase cloud data layer for the Review Library (v0.7.0)
 *
 * Storage: public.review_cards table in Supabase (RLS enforced by auth.uid()).
 *
 * Design decisions:
 *   - All public API functions are async (Supabase calls are async by nature).
 *   - Snake_case DB columns ↔ camelCase JS via mapper functions in this file.
 *   - user_id is taken from authStore — callers do NOT need to pass it.
 *   - If the user is not authenticated or Supabase client is unavailable,
 *     functions return safe empty values rather than throwing.
 *   - The old localStorage layer is removed; no migration is performed.
 */

import { CardData, InputType } from '@/types/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Public Types
   ───────────────────────────────────────────── */

export interface ReviewCard {
  /* ── Identity ── */
  id: string;
  originalText: string;       // user-entered, original casing preserved
  normalizedText: string;     // trim + lowercase — dedup key
  inputType: InputType;

  /* ── Content (from CardData, latest AI generation) ── */
  meaning: string;
  phonetic: string | null;    // IPA or null
  readingChinese: string;
  stressedSyllable: string;
  howToRead: string;
  naturalBreakdown: string;
  examples: Array<{ english: string; chinese: string; context?: string | null }>;
  ttsText: string;            // spoken text (= originalText in practice)

  /* ── Timestamps ── */
  createdAt: number;          // ms timestamp
  updatedAt: number;          // ms timestamp
  queryCount: number;         // incremented each time the same word is looked up

  /* ── SRS state (SM-2) ── */
  easeFactor: number;         // starts 2.3, floor 1.3
  interval: number;           // days until next review  (DB: srs_interval)
  repetitions: number;        // consecutive correct answers
  dueDate: number;            // ms timestamp — when next review is due  (DB: due_date)
  lastReviewDate: number | null;
  totalReviews: number;
  totalLapses: number;        // times q === 0 (complete blank)
  mastered: boolean;
  masteredAt: number | null;
  nextSpotCheckDate: number | null;  // 90-day check-in for mastered words
}

// IndexEntry kept for compatibility with srs.ts queue helpers
export interface IndexEntry {
  id: string;
  normalizedText: string;
  dueDate: number;
  mastered: boolean;
}

// ReviewMeta is no longer persisted (cloud users don't need the localStorage notice)
export interface ReviewMeta {
  riskNoticeShown: boolean;
  firstVisitAt: number | null;
}

export type SaveResult =
  | { status: 'created'; queryCount: 1 }
  | { status: 'updated'; queryCount: number }
  | { status: 'mastered'; queryCount: number }   // caller must show confirm modal
  | { status: 'error'; message: string };

/* ─────────────────────────────────────────────
   DB Row Type (snake_case as returned by Supabase)
   ───────────────────────────────────────────── */

interface DBRow {
  id: string;
  user_id: string;
  original_text: string;
  normalized_text: string;
  input_type: string;
  meaning: string;
  phonetic: string | null;
  reading_chinese: string;
  stressed_syllable: string;
  how_to_read: string;
  natural_breakdown: string;
  examples: Array<{ english: string; chinese: string; context?: string | null }>;
  tts_text: string;
  query_count: number;
  ease_factor: number | string;   // numeric(4,2) may come back as string from PG
  srs_interval: number;
  repetitions: number;
  due_date: string;               // timestamptz → ISO string
  last_review_date: string | null;
  total_reviews: number;
  total_lapses: number;
  mastered: boolean;
  mastered_at: string | null;
  next_spot_check_date: string | null;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────
   Mapper: DB → JS
   ───────────────────────────────────────────── */

function rowToCard(row: DBRow): ReviewCard {
  return {
    id: row.id,
    originalText: row.original_text,
    normalizedText: row.normalized_text,
    inputType: row.input_type as InputType,
    meaning: row.meaning,
    phonetic: row.phonetic,
    readingChinese: row.reading_chinese,
    stressedSyllable: row.stressed_syllable,
    howToRead: row.how_to_read,
    naturalBreakdown: row.natural_breakdown,
    examples: row.examples,
    ttsText: row.tts_text,
    queryCount: row.query_count,
    // numeric(4,2) may come back as string from some PG drivers
    easeFactor: typeof row.ease_factor === 'string' ? parseFloat(row.ease_factor) : row.ease_factor,
    interval: row.srs_interval,
    repetitions: row.repetitions,
    dueDate: new Date(row.due_date).getTime(),
    lastReviewDate: row.last_review_date ? new Date(row.last_review_date).getTime() : null,
    totalReviews: row.total_reviews,
    totalLapses: row.total_lapses,
    mastered: row.mastered,
    masteredAt: row.mastered_at ? new Date(row.mastered_at).getTime() : null,
    nextSpotCheckDate: row.next_spot_check_date ? new Date(row.next_spot_check_date).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

/* ─────────────────────────────────────────────
   Internal helpers
   ───────────────────────────────────────────── */

function getClient() {
  return createSupabaseBrowserClient();
}

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

function todayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* ─────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────── */

/**
 * Save a card generated from the main lookup flow.
 *
 * Dedup rules (PRD-11):
 *   - New word → insert, init SRS, queryCount = 1
 *   - Existing, not mastered → update content fields only, preserve SRS, queryCount += 1
 *   - Existing, mastered → return {status:'mastered'}, caller shows confirm modal
 */
export async function saveCard(cardData: CardData): Promise<SaveResult> {
  const supabase = getClient();
  const userId = getUserId();
  if (!supabase || !userId) {
    return { status: 'error', message: '未登录，无法保存' };
  }

  const normalizedText = cardData.originalInput.trim().toLowerCase();

  // Check for existing card by (user_id, normalized_text)
  const { data: existing, error: fetchErr } = await supabase
    .from('review_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('normalized_text', normalizedText)
    .maybeSingle();

  if (fetchErr) {
    console.error('[review-store] fetch existing card failed:', fetchErr);
    return { status: 'error', message: fetchErr.message };
  }

  const contentFields = {
    original_text: cardData.originalInput,
    input_type: cardData.inputType,
    meaning: cardData.meaning.main,
    phonetic: cardData.phonetic.ipa,
    reading_chinese: cardData.pronunciation.readingChinese,
    stressed_syllable: cardData.pronunciation.stressedSyllable,
    how_to_read: cardData.pronunciation.howToRead,
    natural_breakdown: cardData.pronunciation.naturalBreakdown,
    examples: cardData.examples.map((ex) => ({
      english: ex.english,
      chinese: ex.chinese,
      context: ex.context ?? null,
    })),
    tts_text: cardData.originalInput,
  };

  if (existing) {
    const existingCard = rowToCard(existing as DBRow);

    if (existingCard.mastered) {
      return { status: 'mastered', queryCount: existingCard.queryCount };
    }

    // Update content only, preserve all SRS state
    const { error: updateErr } = await supabase
      .from('review_cards')
      .update({
        ...contentFields,
        query_count: existingCard.queryCount + 1,
      })
      .eq('id', existingCard.id);

    if (updateErr) {
      console.error('[review-store] update card failed:', updateErr);
      return { status: 'error', message: updateErr.message };
    }

    return { status: 'updated', queryCount: existingCard.queryCount + 1 };
  }

  // New card — insert with initial SRS state
  const { error: insertErr } = await supabase.from('review_cards').insert({
    user_id: userId,
    normalized_text: normalizedText,
    ...contentFields,
    query_count: 1,
    // SRS initial state
    ease_factor: 2.3,
    srs_interval: 0,
    repetitions: 0,
    due_date: msToIso(todayMidnight()),  // due today
    last_review_date: null,
    total_reviews: 0,
    total_lapses: 0,
    mastered: false,
    mastered_at: null,
    next_spot_check_date: null,
  });

  if (insertErr) {
    console.error('[review-store] insert card failed:', insertErr);
    return { status: 'error', message: insertErr.message };
  }

  return { status: 'created', queryCount: 1 };
}

/**
 * Re-add a mastered word to the active review queue.
 * Called when user confirms the modal for a mastered word.
 */
export async function reactivateMasteredCard(normalizedText: string): Promise<boolean> {
  const supabase = getClient();
  const userId = getUserId();
  if (!supabase || !userId) return false;

  const { error } = await supabase
    .from('review_cards')
    .update({
      mastered: false,
      mastered_at: null,
      next_spot_check_date: null,
      due_date: msToIso(todayMidnight()),
    })
    .eq('user_id', userId)
    .eq('normalized_text', normalizedText);

  if (error) {
    console.error('[review-store] reactivate mastered card failed:', error);
    return false;
  }
  return true;
}

/** Load a single card by id. */
export async function getCard(id: string): Promise<ReviewCard | null> {
  const supabase = getClient();
  const userId = getUserId();
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('review_cards')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[review-store] getCard failed:', error);
    return null;
  }
  return data ? rowToCard(data as DBRow) : null;
}

/** Get all cards (full data). Use for export or stats. */
export async function getAllCards(): Promise<ReviewCard[]> {
  const supabase = getClient();
  const userId = getUserId();
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from('review_cards')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('[review-store] getAllCards failed:', error);
    return [];
  }
  return (data ?? []).map((row) => rowToCard(row as DBRow));
}

/** Get all index entries (lightweight, derived from cards). */
export async function getAllIndex(): Promise<IndexEntry[]> {
  const cards = await getAllCards();
  return cards.map((c) => ({
    id: c.id,
    normalizedText: c.normalizedText,
    dueDate: c.dueDate,
    mastered: c.mastered,
  }));
}

/** Update a card's SRS state after a review. */
export async function updateCardSRS(id: string, updates: Partial<ReviewCard>): Promise<boolean> {
  const supabase = getClient();
  const userId = getUserId();
  if (!supabase || !userId) return false;

  // Map JS camelCase fields to DB snake_case
  // Only the SRS fields that applyReview() returns need mapping here
  const dbUpdates: Record<string, unknown> = {};
  if (updates.easeFactor !== undefined) dbUpdates.ease_factor = updates.easeFactor;
  if (updates.interval !== undefined) dbUpdates.srs_interval = updates.interval;
  if (updates.repetitions !== undefined) dbUpdates.repetitions = updates.repetitions;
  if (updates.dueDate !== undefined) dbUpdates.due_date = msToIso(updates.dueDate);
  if (updates.lastReviewDate !== undefined) {
    dbUpdates.last_review_date = updates.lastReviewDate ? msToIso(updates.lastReviewDate) : null;
  }
  if (updates.totalReviews !== undefined) dbUpdates.total_reviews = updates.totalReviews;
  if (updates.totalLapses !== undefined) dbUpdates.total_lapses = updates.totalLapses;
  if (updates.mastered !== undefined) dbUpdates.mastered = updates.mastered;
  if (updates.masteredAt !== undefined) {
    dbUpdates.mastered_at = updates.masteredAt ? msToIso(updates.masteredAt) : null;
  }
  if (updates.nextSpotCheckDate !== undefined) {
    dbUpdates.next_spot_check_date = updates.nextSpotCheckDate
      ? msToIso(updates.nextSpotCheckDate)
      : null;
  }

  const { error } = await supabase
    .from('review_cards')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[review-store] updateCardSRS failed:', error);
    return false;
  }
  return true;
}

/** Mark a card as mastered. */
export async function markMastered(id: string): Promise<boolean> {
  const now = Date.now();
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  return updateCardSRS(id, {
    mastered: true,
    masteredAt: now,
    nextSpotCheckDate: now + NINETY_DAYS_MS,
  });
}

/** Delete a single card. */
export async function deleteCard(id: string): Promise<boolean> {
  const supabase = getClient();
  const userId = getUserId();
  if (!supabase || !userId) return false;

  const { error } = await supabase
    .from('review_cards')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[review-store] deleteCard failed:', error);
    return false;
  }
  return true;
}

/** Export all data as a JSON blob (for download). Data source is now Supabase. */
export async function exportAllData(): Promise<string> {
  const cards = await getAllCards();
  const index: IndexEntry[] = cards.map((c) => ({
    id: c.id,
    normalizedText: c.normalizedText,
    dueDate: c.dueDate,
    mastered: c.mastered,
  }));
  return JSON.stringify(
    { version: '0.7.0', exportedAt: new Date().toISOString(), index, cards },
    null,
    2,
  );
}

/* ─────────────────────────────────────────────
   Meta (cloud users don't need the old localStorage notice)
   ───────────────────────────────────────────── */

export function getMeta(): ReviewMeta {
  // Cloud-backed storage — the local risk notice is no longer relevant.
  // Return riskNoticeShown=true so the old modal never shows.
  return { riskNoticeShown: true, firstVisitAt: null };
}

export function setMetaField(updates: Partial<ReviewMeta>): void {
  // No-op for cloud storage — meta is no longer persisted client-side.
  void updates;
}

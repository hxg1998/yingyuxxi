/**
 * review-store.ts — localStorage data layer for the Review Library (v0.4.0)
 *
 * Storage layout:
 *   wordcard_index         JSON Array<IndexEntry>   — lightweight list for sorting/filtering
 *   wordcard_card_<id>     JSON ReviewCard          — full card data per word
 *   wordcard_meta          JSON ReviewMeta          — global flags (risk notice shown, etc.)
 *
 * Key design decisions:
 *   - Each card is stored independently to prevent one huge JSON blob from growing unbounded.
 *   - The index mirrors dueDate + mastered so the list page never reads all full cards.
 *   - Dedup key = normalizedText (originalText.trim().toLowerCase()).
 *   - QuotaExceededError is caught and surfaced; we never silently fail.
 *   - Audio is NOT stored — only ttsText (the string to feed to TTS at play time).
 */

import { CardData, InputType } from '@/types/card';

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
  createdAt: number;
  updatedAt: number;
  queryCount: number;         // incremented each time the same word is looked up

  /* ── SRS state (SM-2) ── */
  easeFactor: number;         // starts 2.3, floor 1.3
  interval: number;           // days until next review
  repetitions: number;        // consecutive correct answers
  dueDate: number;            // ms timestamp — when next review is due
  lastReviewDate: number | null;
  totalReviews: number;
  totalLapses: number;        // times q === 0 (complete blank)
  mastered: boolean;
  masteredAt: number | null;
  nextSpotCheckDate: number | null;  // 90-day check-in for mastered words
}

export interface IndexEntry {
  id: string;
  normalizedText: string;
  dueDate: number;
  mastered: boolean;
}

export interface ReviewMeta {
  riskNoticeShown: boolean;
  firstVisitAt: number | null;
}

export type SaveResult =
  | { status: 'created'; queryCount: 1 }
  | { status: 'updated'; queryCount: number }
  | { status: 'mastered'; queryCount: number }   // caller must show confirm modal
  | { status: 'quota_exceeded' };

/* ─────────────────────────────────────────────
   Storage Keys
   ───────────────────────────────────────────── */
const KEY_INDEX = 'wordcard_index';
const KEY_META  = 'wordcard_meta';
const cardKey   = (id: string) => `wordcard_card_${id}`;

/* ─────────────────────────────────────────────
   Internal helpers
   ───────────────────────────────────────────── */

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readIndex(): IndexEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(KEY_INDEX);
    return raw ? (JSON.parse(raw) as IndexEntry[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: IndexEntry[]): boolean {
  try {
    localStorage.setItem(KEY_INDEX, JSON.stringify(entries));
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') return false;
    return false;
  }
}

function readCard(id: string): ReviewCard | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(cardKey(id));
    return raw ? (JSON.parse(raw) as ReviewCard) : null;
  } catch {
    return null;
  }
}

function writeCard(card: ReviewCard): boolean {
  try {
    localStorage.setItem(cardKey(card.id), JSON.stringify(card));
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') return false;
    return false;
  }
}

function generateId(): string {
  // Simple UUID v4 — no external dependency
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Midnight (00:00:00.000) of today, local time */
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
 * Dedup rules:
 *   - New word → create, init SRS, queryCount = 1
 *   - Existing, not mastered → update content only, preserve SRS, queryCount += 1
 *   - Existing, mastered → return {status:'mastered'}, caller shows confirm modal
 */
export function saveCard(cardData: CardData): SaveResult {
  if (!isClient()) return { status: 'quota_exceeded' };

  const normalizedText = cardData.originalInput.trim().toLowerCase();
  const index = readIndex();
  const existingEntry = index.find((e) => e.normalizedText === normalizedText);

  if (existingEntry) {
    const existing = readCard(existingEntry.id);
    if (!existing) {
      // Index out of sync — treat as new
      return createNewCard(cardData, normalizedText, index);
    }

    if (existing.mastered) {
      // Caller must show confirm modal
      return { status: 'mastered', queryCount: existing.queryCount };
    }

    // Update content fields, preserve all SRS state
    const updated: ReviewCard = {
      ...existing,
      meaning: cardData.meaning.main,
      phonetic: cardData.phonetic.ipa,
      readingChinese: cardData.pronunciation.readingChinese,
      stressedSyllable: cardData.pronunciation.stressedSyllable,
      howToRead: cardData.pronunciation.howToRead,
      naturalBreakdown: cardData.pronunciation.naturalBreakdown,
      examples: cardData.examples.map((ex) => ({
        english: ex.english,
        chinese: ex.chinese,
        context: ex.context,
      })),
      ttsText: cardData.originalInput,
      updatedAt: Date.now(),
      queryCount: existing.queryCount + 1,
    };

    if (!writeCard(updated)) return { status: 'quota_exceeded' };
    return { status: 'updated', queryCount: updated.queryCount };
  }

  return createNewCard(cardData, normalizedText, index);
}

function createNewCard(
  cardData: CardData,
  normalizedText: string,
  index: IndexEntry[],
): SaveResult {
  const id = generateId();
  const now = Date.now();
  const due = todayMidnight(); // Due immediately (today)

  const card: ReviewCard = {
    id,
    originalText: cardData.originalInput,
    normalizedText,
    inputType: cardData.inputType,
    meaning: cardData.meaning.main,
    phonetic: cardData.phonetic.ipa,
    readingChinese: cardData.pronunciation.readingChinese,
    stressedSyllable: cardData.pronunciation.stressedSyllable,
    howToRead: cardData.pronunciation.howToRead,
    naturalBreakdown: cardData.pronunciation.naturalBreakdown,
    examples: cardData.examples.map((ex) => ({
      english: ex.english,
      chinese: ex.chinese,
      context: ex.context,
    })),
    ttsText: cardData.originalInput,
    createdAt: now,
    updatedAt: now,
    queryCount: 1,
    // SRS initial state
    easeFactor: 2.3,
    interval: 0,
    repetitions: 0,
    dueDate: due,
    lastReviewDate: null,
    totalReviews: 0,
    totalLapses: 0,
    mastered: false,
    masteredAt: null,
    nextSpotCheckDate: null,
  };

  if (!writeCard(card)) return { status: 'quota_exceeded' };

  const newIndex: IndexEntry[] = [
    ...index,
    { id, normalizedText, dueDate: due, mastered: false },
  ];
  if (!writeIndex(newIndex)) return { status: 'quota_exceeded' };

  return { status: 'created', queryCount: 1 };
}

/**
 * Re-add a mastered word to the active queue.
 * Called when user confirms the modal for a mastered word.
 */
export function reactivateMasteredCard(normalizedText: string): boolean {
  const index = readIndex();
  const entry = index.find((e) => e.normalizedText === normalizedText);
  if (!entry) return false;

  const card = readCard(entry.id);
  if (!card) return false;

  const today = todayMidnight();
  const updated: ReviewCard = {
    ...card,
    mastered: false,
    masteredAt: null,
    nextSpotCheckDate: null,
    dueDate: today,
    updatedAt: Date.now(),
  };

  if (!writeCard(updated)) return false;

  const newIndex = index.map((e) =>
    e.id === entry.id ? { ...e, mastered: false, dueDate: today } : e,
  );
  return writeIndex(newIndex);
}

/** Load a single card by id. */
export function getCard(id: string): ReviewCard | null {
  return readCard(id);
}

/** Get all index entries (lightweight, for list page). */
export function getAllIndex(): IndexEntry[] {
  return readIndex();
}

/** Get all full cards — use sparingly (export, statistics). */
export function getAllCards(): ReviewCard[] {
  const index = readIndex();
  return index.map((e) => readCard(e.id)).filter((c): c is ReviewCard => c !== null);
}

/** Update a card's SRS state after a review. Also syncs the index. */
export function updateCardSRS(id: string, updates: Partial<ReviewCard>): boolean {
  const card = readCard(id);
  if (!card) return false;

  const updated = { ...card, ...updates };
  if (!writeCard(updated)) return false;

  // Sync index entry (dueDate + mastered may have changed)
  const index = readIndex();
  const newIndex = index.map((e) =>
    e.id === id
      ? { ...e, dueDate: updated.dueDate, mastered: updated.mastered }
      : e,
  );
  return writeIndex(newIndex);
}

/** Mark a card as mastered. */
export function markMastered(id: string): boolean {
  const card = readCard(id);
  if (!card) return false;

  const now = Date.now();
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const updated: ReviewCard = {
    ...card,
    mastered: true,
    masteredAt: now,
    nextSpotCheckDate: now + NINETY_DAYS_MS,
    updatedAt: now,
  };

  if (!writeCard(updated)) return false;

  const index = readIndex();
  const newIndex = index.map((e) =>
    e.id === id ? { ...e, mastered: true, dueDate: updated.nextSpotCheckDate! } : e,
  );
  return writeIndex(newIndex);
}

/** Delete a single card (removes card data + index entry). */
export function deleteCard(id: string): boolean {
  localStorage.removeItem(cardKey(id));
  const index = readIndex();
  return writeIndex(index.filter((e) => e.id !== id));
}

/** Export all data as a JSON blob (for download). */
export function exportAllData(): string {
  const index = readIndex();
  const cards = getAllCards();
  const meta = getMeta();
  return JSON.stringify({ version: '0.4.0', exportedAt: new Date().toISOString(), meta, index, cards }, null, 2);
}

/* ─────────────────────────────────────────────
   Meta
   ───────────────────────────────────────────── */

export function getMeta(): ReviewMeta {
  if (!isClient()) return { riskNoticeShown: false, firstVisitAt: null };
  try {
    const raw = localStorage.getItem(KEY_META);
    return raw ? (JSON.parse(raw) as ReviewMeta) : { riskNoticeShown: false, firstVisitAt: null };
  } catch {
    return { riskNoticeShown: false, firstVisitAt: null };
  }
}

export function setMetaField(updates: Partial<ReviewMeta>): void {
  if (!isClient()) return;
  const current = getMeta();
  try {
    localStorage.setItem(KEY_META, JSON.stringify({ ...current, ...updates }));
  } catch {
    // Not critical — meta write failure doesn't corrupt data
  }
}

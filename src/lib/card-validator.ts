import { CardData } from '@/types/card';

/**
 * Validate that AI-returned card data has all required fields.
 * Missing required fields → throw (triggers parse_error response).
 * Missing optional fields → fill with null silently.
 */
export function validateAndNormalizeCard(raw: unknown): CardData {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Response is not an object');
  }

  const obj = raw as Record<string, unknown>;

  // Check top-level required fields
  if (typeof obj.originalInput !== 'string' || !obj.originalInput) {
    throw new Error('Missing required field: originalInput');
  }
  if (typeof obj.inputType !== 'string') {
    throw new Error('Missing required field: inputType');
  }

  // Validate meaning
  if (typeof obj.meaning !== 'object' || obj.meaning === null) {
    throw new Error('Missing required field: meaning');
  }
  const meaning = obj.meaning as Record<string, unknown>;
  if (typeof meaning.main !== 'string' || !meaning.main) {
    throw new Error('Missing required field: meaning.main');
  }

  // Validate pronunciation (all sub-fields required)
  if (typeof obj.pronunciation !== 'object' || obj.pronunciation === null) {
    throw new Error('Missing required field: pronunciation');
  }
  const pron = obj.pronunciation as Record<string, unknown>;
  if (typeof pron.readingChinese !== 'string' || !pron.readingChinese) {
    throw new Error('Missing required field: pronunciation.readingChinese');
  }
  if (typeof pron.howToRead !== 'string' || !pron.howToRead) {
    throw new Error('Missing required field: pronunciation.howToRead');
  }
  if (typeof pron.naturalBreakdown !== 'string' || !pron.naturalBreakdown) {
    throw new Error('Missing required field: pronunciation.naturalBreakdown');
  }

  // Validate examples (array with at least 1 item)
  if (!Array.isArray(obj.examples) || obj.examples.length === 0) {
    throw new Error('Missing required field: examples (must be non-empty array)');
  }
  const firstEx = obj.examples[0] as Record<string, unknown>;
  if (typeof firstEx.english !== 'string' || !firstEx.english) {
    throw new Error('Missing required field: examples[0].english');
  }
  if (typeof firstEx.chinese !== 'string' || !firstEx.chinese) {
    throw new Error('Missing required field: examples[0].chinese');
  }

  // Build normalized CardData (filling optional fields with null)
  const phonetic = (obj.phonetic as Record<string, unknown> | null) ?? {};
  const translit = (obj.translit as Record<string, unknown> | null) ?? {};
  const audio = (obj.audio as Record<string, unknown> | null) ?? {};

  return {
    originalInput: obj.originalInput as string,
    inputType: obj.inputType as CardData['inputType'],
    generatedAt: typeof obj.generatedAt === 'string' ? obj.generatedAt : undefined,
    meaning: {
      main: meaning.main as string,
      contextNote: typeof meaning.contextNote === 'string' ? meaning.contextNote : null,
    },
    phonetic: {
      ipa: typeof phonetic.ipa === 'string' ? phonetic.ipa : null,
    },
    pronunciation: {
      readingChinese: pron.readingChinese as string,
      // stressedSyllable optional — fall back to empty (no bold) if absent or not a substring
      stressedSyllable:
        typeof pron.stressedSyllable === 'string' &&
        (pron.readingChinese as string).includes(pron.stressedSyllable)
          ? pron.stressedSyllable
          : '',
      howToRead: pron.howToRead as string,
      naturalBreakdown: pron.naturalBreakdown as string,
    },
    translit: {
      text: typeof translit.text === 'string' ? translit.text : null,
      disclaimer: typeof translit.disclaimer === 'string'
        ? translit.disclaimer
        : '仅辅助开口，最终以英文发音为准',
    },
    // Only take first 2 examples
    examples: (obj.examples as unknown[]).slice(0, 2).map((ex) => {
      const e = ex as Record<string, unknown>;
      return {
        english: e.english as string,
        chinese: e.chinese as string,
        context: typeof e.context === 'string' ? e.context : null,
      };
    }),
    audio: {
      url: typeof audio.url === 'string' && audio.url ? audio.url : null,
      sourceLabel: typeof audio.sourceLabel === 'string' ? audio.sourceLabel : null,
    },
  };
}

// Core type definitions for WordCard
// All types map directly to the AI-generated card data structure

export type InputType = 'word' | 'phrase' | 'sentence';

export interface PronunciationData {
  readingChinese: string;
  // Hero line: PURE Chinese phonetic approximation a non-English-reader can read aloud.
  // No English letters, no IPA. Syllables joined by "-", e.g. "呃-赖恩-门特"
  stressedSyllable: string;
  // The single Chinese syllable in readingChinese to emphasize (重读), e.g. "赖恩".
  // Must be a substring of readingChinese; used to bold it in the UI.
  howToRead: string;
  // Plain-language rhythm guidance in everyday Chinese (1-2 sentences).
  // e.g. "中间『赖恩』使劲、拖长，两头『呃』和『门特』轻声快快带过。"
  naturalBreakdown: string;
  // Secondary reference: English syllable breakdown, stressed syllable UPPERCASE, e.g. "a-LINE-ment"
}

export interface ExampleItem {
  english: string;
  chinese: string;
  context?: string | null;
}

export interface CardData {
  originalInput: string;
  inputType: InputType;
  generatedAt?: string;

  meaning: {
    main: string;
    contextNote: string | null;
  };

  phonetic: {
    ipa: string | null;
  };

  pronunciation: PronunciationData;

  examples: ExampleItem[];

  audio: {
    url: string | null;
    sourceLabel: string | null;
  };
}

export interface CardError {
  type: 'timeout' | 'api_error' | 'invalid_key' | 'network' | 'parse_error' | 'unknown';
  message: string;
  retryable: boolean;
}

export interface GenerateCardRequest {
  input: string;
  inputType: InputType;
}

export interface GenerateCardResponse {
  success: true;
  data: CardData;
}

export interface GenerateCardErrorResponse {
  success: false;
  errorCode: 'input_empty' | 'input_too_long' | 'not_english' |
             'timeout' | 'api_error' | 'invalid_key' | 'network' |
             'parse_error' | 'unknown';
  message: string;
  retryable: boolean;
}

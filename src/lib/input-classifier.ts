import { InputType } from '@/types/card';

/**
 * Classify user input into word / phrase / sentence.
 *
 * Rules (in priority order):
 * 1. Ends with sentence-closing punctuation → sentence
 * 2. Single token (no spaces) → word
 * 3. 2-5 tokens → phrase
 * 4. 6+ tokens → sentence (assumed sentence fragment)
 *
 * Token: whitespace-split word (hyphenated compounds count as 1 token)
 */
export function classifyInput(input: string): InputType {
  const trimmed = input.trim();

  // Rule 1: sentence-ending punctuation takes top priority
  if (/[.!?。！？]$/.test(trimmed)) return 'sentence';

  const tokens = trimmed.split(/\s+/).filter(Boolean);

  // Rule 2: single token
  if (tokens.length === 1) return 'word';

  // Rule 3: 2-5 tokens without terminal punctuation
  if (tokens.length >= 2 && tokens.length <= 5) return 'phrase';

  // Rule 4: 6+ tokens treated as sentence fragment
  return 'sentence';
}

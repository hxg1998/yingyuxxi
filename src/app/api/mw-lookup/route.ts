import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/mw-lookup?word=xxx
 *
 * Queries the Merriam-Webster Collegiate Dictionary API for a word's
 * pronunciation audio filename, then assembles the audio URL following MW's
 * subdirectory rules.  Returns JSON — never proxies the audio MP3 itself.
 *
 * Response shapes:
 *   200  { audioUrl: string, word: string }   — found audio
 *   200  { audioUrl: null,   word: string }   — word found but no audio
 *   400  { error: string, audioUrl: null }    — missing word param
 *   502  { error: string, audioUrl: null }    — MW API upstream error
 *   503  { error: string, audioUrl: null }    — API key not configured
 *
 * Security: MW_COLLEGIATE_API_KEY lives only here (no NEXT_PUBLIC_ prefix).
 * The raw MW response is never forwarded to the client.
 */

// Subdirectory rules per MW audio URL specification:
// https://dictionaryapi.com/products/json#sec-2.prs
function getAudioSubdir(audio: string): string {
  if (audio.startsWith('bix')) return 'bix';
  if (audio.startsWith('gg')) return 'gg';
  const firstChar = audio[0];
  // Digits 0-9 or non-letter characters → "number" subdirectory
  if (/[^a-zA-Z]/.test(firstChar)) return 'number';
  return firstChar.toLowerCase();
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.MW_COLLEGIATE_API_KEY;

  if (!apiKey) {
    console.error('[mw-lookup] MW_COLLEGIATE_API_KEY is not configured');
    return NextResponse.json(
      { error: 'MW_COLLEGIATE_API_KEY not configured', audioUrl: null },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const word = searchParams.get('word');

  if (!word || word.trim().length === 0) {
    return NextResponse.json(
      { error: 'word parameter is required', audioUrl: null },
      { status: 400 }
    );
  }

  const normalizedWord = word.trim().toLowerCase();

  // Call MW Collegiate Dictionary API
  let mwRes: Response;
  try {
    mwRes = await fetch(
      `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(normalizedWord)}?key=${apiKey}`,
      { next: { revalidate: 0 } } // no Next.js cache — MW has its own rate limits
    );
  } catch (err) {
    console.error('[mw-lookup] MW API fetch failed:', err);
    return NextResponse.json(
      { error: 'MW API unreachable', audioUrl: null },
      { status: 502 }
    );
  }

  if (!mwRes.ok) {
    console.error('[mw-lookup] MW API returned HTTP', mwRes.status);
    return NextResponse.json(
      { error: `MW API error (${mwRes.status})`, audioUrl: null },
      { status: 502 }
    );
  }

  let mwData: unknown;
  try {
    mwData = await mwRes.json();
  } catch (err) {
    console.error('[mw-lookup] Failed to parse MW API response:', err);
    return NextResponse.json(
      { error: 'MW API response parse error', audioUrl: null },
      { status: 502 }
    );
  }

  // MW returns an array of entries.  The first element is the primary match.
  // If it returns an array of strings (spelling suggestions), the word wasn't found.
  if (
    !Array.isArray(mwData) ||
    mwData.length === 0 ||
    typeof mwData[0] !== 'object' ||
    mwData[0] === null
  ) {
    // Word not found in MW (or suggestions-only response)
    return NextResponse.json({ audioUrl: null, word: normalizedWord });
  }

  // Extract audio filename from the first entry's pronunciation list
  // Path: response[0].hwi.prs[0].sound.audio
  type MWEntry = {
    hwi?: {
      prs?: Array<{
        sound?: {
          audio?: string;
        };
      }>;
    };
  };

  const entry = mwData[0] as MWEntry;
  const audio = entry?.hwi?.prs?.[0]?.sound?.audio;

  if (!audio || typeof audio !== 'string' || audio.trim() === '') {
    // Entry exists but has no audio
    return NextResponse.json({ audioUrl: null, word: normalizedWord });
  }

  const subdir = getAudioSubdir(audio);
  const audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audio}.mp3`;

  console.log('[mw-lookup] resolved audio for', normalizedWord, '->', audioUrl);

  return NextResponse.json({ audioUrl, word: normalizedWord });
}

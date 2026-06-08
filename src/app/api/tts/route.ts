import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

// Cache directory in project root — excluded from git via .gitignore
const CACHE_DIR = join(process.cwd(), '.tts-cache');

function getCachedPath(text: string): string {
  const hash = createHash('sha256').update(text).digest('hex');
  return join(CACHE_DIR, `${hash}.mp3`);
}

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.TTS_API_KEY;
  const baseUrl = process.env.TTS_BASE_URL ?? 'https://aihubmix.com/v1';
  const model = process.env.TTS_MODEL ?? 'gpt-4o-mini-tts';
  const voice = process.env.TTS_VOICE ?? 'alloy';

  // Key missing — tell the client to fall back to browser TTS
  if (!apiKey) {
    return NextResponse.json(
      { error: 'TTS_API_KEY not configured', fallback: true },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = (body as { text?: unknown }).text;

  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (text.length > 300) {
    return NextResponse.json({ error: 'text exceeds 300 character limit' }, { status: 400 });
  }

  const trimmedText = text.trim();

  // Check cache first
  ensureCacheDir();
  const cachePath = getCachedPath(trimmedText);
  if (existsSync(cachePath)) {
    console.log('[TTS] cache hit for:', trimmedText.slice(0, 50));
    const cached = readFileSync(cachePath);
    return new NextResponse(cached, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'HIT',
      },
    });
  }

  // Call upstream TTS API
  console.log('[TTS] cache miss, calling upstream for:', trimmedText.slice(0, 50));
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: trimmedText,
        voice,
        response_format: 'mp3',
      }),
    });
  } catch (err) {
    console.error('[TTS] upstream fetch failed:', err);
    return NextResponse.json({ error: 'TTS upstream unreachable' }, { status: 502 });
  }

  if (!upstreamRes.ok) {
    // Never forward the raw upstream body — it may contain key info
    console.error('[TTS] upstream returned', upstreamRes.status);
    return NextResponse.json(
      { error: `TTS upstream error (${upstreamRes.status})` },
      { status: 502 }
    );
  }

  const audioBuffer = Buffer.from(await upstreamRes.arrayBuffer());

  // Write to cache
  try {
    writeFileSync(cachePath, audioBuffer);
    console.log('[TTS] cached to disk:', cachePath);
  } catch (cacheErr) {
    // Non-fatal — still serve the audio
    console.warn('[TTS] cache write failed:', cacheErr);
  }

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'X-Cache': 'MISS',
    },
  });
}

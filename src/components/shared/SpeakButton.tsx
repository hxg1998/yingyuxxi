'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@arco-design/web-react';
import { IconPlayCircle, IconLoading } from '@arco-design/web-react/icon';

interface SpeakButtonProps {
  /** The English text to speak aloud (the original user input). */
  text: string;
  /** Optional size passed through to Arco Button. */
  size?: 'mini' | 'small' | 'default' | 'large';
}

/**
 * Tap-to-listen button.
 *
 * Primary: calls /api/tts (OpenAI-compatible TTS, server-side cached) and plays
 * the returned mp3 via the HTMLAudio API.
 *
 * Fallback: if the TTS API call fails for any reason (network error, missing key,
 * upstream down) we silently fall back to the browser's built-in SpeechSynthesis
 * so the user always gets audio.
 *
 * DESIGN.md §6.1: type="outline", icon=IconPlayCircle, --color-success-6 icon color.
 * Visible for all three input types (word / phrase / sentence).
 *
 * Host app required: @import '@arco-themes/react-abcd2/index.less'
 */
export default function SpeakButton({ text, size = 'small' }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  // Cache objectURLs by text so repeat taps skip the network round-trip
  const urlCacheRef = useRef<Map<string, string>>(new Map());
  // Track the currently playing Audio element so we can stop it
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up objectURLs and audio on unmount
  useEffect(() => {
    const audioEl = audioRef;
    const urlCache = urlCacheRef;
    return () => {
      if (audioEl.current) {
        audioEl.current.pause();
        audioEl.current = null;
      }
      urlCache.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // --- Fallback: browser SpeechSynthesis ---
  function speakWithBrowser(spokenText: string) {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof window.SpeechSynthesisUtterance === 'undefined'
    ) {
      setSpeaking(false);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    const voices = synth.getVoices();
    const enVoice =
      voices.find((v) => v.lang === 'en-US') ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('en'));
    if (enVoice) utterance.voice = enVoice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  // --- Primary: TTS API via Audio element ---
  async function speakWithApi(spokenText: string) {
    // Return a cached objectURL immediately if we have one
    const cachedUrl = urlCacheRef.current.get(spokenText);
    if (cachedUrl) {
      playAudioUrl(cachedUrl);
      return;
    }

    setSpeaking(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText }),
      });

      if (!res.ok) {
        // TTS API failed — fall back to browser TTS
        console.warn('[SpeakButton] TTS API returned', res.status, '— falling back to browser TTS');
        speakWithBrowser(spokenText);
        return;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      urlCacheRef.current.set(spokenText, objectUrl);
      playAudioUrl(objectUrl);
    } catch (err) {
      // Network error or other unexpected failure — fall back to browser TTS
      console.warn('[SpeakButton] TTS API error:', err, '— falling back to browser TTS');
      speakWithBrowser(spokenText);
    }
  }

  function playAudioUrl(url: string) {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setSpeaking(true);
    audio.onended = () => setSpeaking(false);
    audio.onerror = () => {
      console.warn('[SpeakButton] Audio playback error');
      setSpeaking(false);
    };
    audio.play().catch((err) => {
      console.warn('[SpeakButton] audio.play() failed:', err);
      setSpeaking(false);
    });
  }

  function handleClick() {
    // If already speaking, stop
    if (speaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
      return;
    }

    speakWithApi(text);
  }

  return (
    <Button
      className="speak-button"
      type="outline"
      shape="round"
      size={size}
      icon={speaking ? <IconLoading /> : <IconPlayCircle />}
      onClick={handleClick}
    >
      {speaking ? '朗读中' : '点我听'}
    </Button>
  );
}

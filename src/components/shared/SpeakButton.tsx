'use client';

import { useEffect, useState } from 'react';
import { Button } from '@arco-design/web-react';
import { IconSound, IconLoading } from '@arco-design/web-react/icon';

interface SpeakButtonProps {
  /** The English text to speak aloud (the original user input). */
  text: string;
  /** Optional size passed through to Arco Button. */
  size?: 'mini' | 'small' | 'default' | 'large';
}

/**
 * Tap-to-listen button using the browser Web Speech API (SpeechSynthesis).
 * Reads the ORIGINAL English text aloud — works for any word/phrase/sentence,
 * no API key, no dictionary coverage dependency.
 *
 * If the browser has no speech synthesis support, the button is not rendered
 * (no error state, consistent with the "no broken affordance" principle).
 *
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function SpeakButton({ text, size = 'small' }: SpeakButtonProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof window.SpeechSynthesisUtterance !== 'undefined'
    );
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return undefined;
    // Prefer a US English voice, then any en-* voice
    return (
      voices.find((v) => v.lang === 'en-US') ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
      undefined
    );
  }

  function handleSpeak() {
    const synth = window.speechSynthesis;
    // Toggle off if already speaking
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // slightly slower for learners
    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <Button
      type="primary"
      shape="round"
      size={size}
      icon={speaking ? <IconLoading /> : <IconSound />}
      onClick={handleSpeak}
    >
      {speaking ? '朗读中' : '点我听'}
    </Button>
  );
}

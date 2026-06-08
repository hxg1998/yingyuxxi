'use client';

import { useEffect, useState } from 'react';
import { Button } from '@arco-design/web-react';
import { IconPlayCircle, IconLoading } from '@arco-design/web-react/icon';

interface SpeakButtonProps {
  /** The English text to speak aloud (the original user input). */
  text: string;
  /** Optional size passed through to Arco Button. */
  size?: 'mini' | 'small' | 'default' | 'large';
}

/**
 * Tap-to-listen button using the browser Web Speech API (SpeechSynthesis).
 * Reads the ORIGINAL English text aloud — works for any word/phrase,
 * no API key, no dictionary coverage dependency.
 *
 * DESIGN.md §6.1: type="outline", icon=IconPlayCircle, --color-success-6 icon color.
 * Not rendered for sentence type — the parent PronunciationModule handles that gate.
 *
 * If the browser has no speech synthesis support, the button is not rendered
 * (no broken affordance).
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
    return (
      voices.find((v) => v.lang === 'en-US') ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
      undefined
    );
  }

  function handleSpeak() {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <Button
      className="speak-button"
      type="outline"
      shape="round"
      size={size}
      icon={
        speaking ? (
          <IconLoading />
        ) : (
          /* Apply success-6 color to the play icon via inline style on the wrapper */
          <span className="speak-button-icon">
            <IconPlayCircle />
          </span>
        )
      }
      onClick={handleSpeak}
    >
      {speaking ? '朗读中' : '点我听'}
    </Button>
  );
}

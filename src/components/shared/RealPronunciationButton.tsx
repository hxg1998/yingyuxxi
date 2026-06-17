'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Tooltip } from '@arco-design/web-react';
import {
  IconUserGroup,
  IconLoading,
  IconPauseCircle,
} from '@arco-design/web-react/icon';
import { InputType } from '@/types/card';

interface RealPronunciationButtonProps {
  /** The word to look up — should be originalInput / originalText from CardData. */
  word: string;
  /** Determines initial disabled state: phrase/sentence → disabled-type. */
  inputType: InputType;
  /** Optional size override. Defaults to 'small' to match SpeakButton. */
  size?: 'mini' | 'small' | 'default' | 'large';
}

/**
 * 6-state state machine for the "真人发音" button.
 *
 *   idle            → user clicks → loading
 *   loading         → audioUrl returned → playing
 *   loading         → audioUrl null → disabled-no-audio
 *   loading         → network / API error → error
 *   playing         → audio ended → idle
 *   playing         → user clicks → idle (stop)
 *   playing         → audio onerror → error
 *   disabled-type   → terminal (inputType is phrase/sentence)
 *   disabled-no-audio → terminal (MW has no recording for this word)
 *   error           → terminal (user must reload to retry)
 *
 * Design spec: DESIGN-real-pronunciation.md
 * Icon color: --color-primary-6 (blue — distinguishes from SpeakButton's green --color-success-6)
 * Arco Button: type="outline" shape="round" size="small"
 */

type ButtonState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'disabled-type'
  | 'disabled-no-audio'
  | 'error';

function getTooltipContent(state: ButtonState): string | null {
  switch (state) {
    case 'disabled-type':
      return '仅支持单词';
    case 'disabled-no-audio':
      return '该词暂无真人录音';
    case 'error':
      return '发音加载失败，请稍后重试';
    default:
      return null;
  }
}

export default function RealPronunciationButton({
  word,
  inputType,
  size = 'small',
}: RealPronunciationButtonProps) {
  // Derive initial state from inputType synchronously — no useEffect needed.
  const initialState: ButtonState =
    inputType !== 'word' ? 'disabled-type' : 'idle';
  const [btnState, setBtnState] = useState<ButtonState>(initialState);

  // Track the Audio element so we can stop it on click or unmount
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset button state if inputType changes (e.g. parent re-renders with a different card)
  useEffect(() => {
    setBtnState(inputType !== 'word' ? 'disabled-type' : 'idle');
  }, [inputType, word]);

  // Cleanup: stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function handleClick() {
    if (btnState === 'playing') {
      // Stop playback and return to idle
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setBtnState('idle');
      return;
    }

    if (btnState !== 'idle') return; // guard against unexpected clicks

    setBtnState('loading');

    // Query MW via our server-side route (keeps API key off the client)
    let audioUrl: string | null = null;
    try {
      const res = await fetch(
        `/api/mw-lookup?word=${encodeURIComponent(word.trim())}`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        console.warn('[RealPronunciationButton] /api/mw-lookup returned', res.status);
        setBtnState('error');
        return;
      }

      const data = await res.json() as { audioUrl: string | null; word?: string; error?: string };

      if (data.error || !data.audioUrl) {
        // Word found but no audio recording
        setBtnState('disabled-no-audio');
        return;
      }

      audioUrl = data.audioUrl;
    } catch (err) {
      console.warn('[RealPronunciationButton] fetch failed:', err);
      setBtnState('error');
      return;
    }

    // Play the MP3 directly from MW servers (no proxy — per PRD §V1)
    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        audioRef.current = null;
        setBtnState('idle');
      };

      audio.onerror = () => {
        console.warn('[RealPronunciationButton] Audio playback error');
        audioRef.current = null;
        setBtnState('error');
      };

      await audio.play();
      setBtnState('playing');
    } catch (err) {
      console.warn('[RealPronunciationButton] audio.play() failed:', err);
      audioRef.current = null;
      setBtnState('error');
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────

  function getIcon() {
    switch (btnState) {
      case 'loading':
        return <IconLoading spin style={{ color: 'var(--color-primary-6)' }} />;
      case 'playing':
        return <IconPauseCircle style={{ color: 'var(--color-primary-6)' }} />;
      default:
        // idle / disabled-* / error all show IconUserGroup
        // Color is inherited from Button disabled styles for disabled states
        return btnState === 'idle'
          ? <IconUserGroup style={{ color: 'var(--color-primary-6)' }} />
          : <IconUserGroup />;
    }
  }

  function getLabel() {
    switch (btnState) {
      case 'loading':
        return '加载中';
      case 'playing':
        return '播放中';
      default:
        return '真人发音';
    }
  }

  const isDisabled =
    btnState === 'loading' ||
    btnState === 'disabled-type' ||
    btnState === 'disabled-no-audio' ||
    btnState === 'error';

  const tooltipContent = getTooltipContent(btnState);

  const button = (
    <Button
      type="outline"
      shape="round"
      size={size}
      icon={getIcon()}
      disabled={isDisabled}
      style={
        btnState === 'idle' || btnState === 'loading' || btnState === 'playing'
          ? { color: 'var(--color-primary-6)' }
          : undefined
      }
      onClick={handleClick}
    >
      {getLabel()}
    </Button>
  );

  // Arco Button with disabled=true blocks pointer events, so wrap it in a
  // span to make Tooltip's hover detection work (DESIGN §7.1 / §14.4).
  if (tooltipContent) {
    return (
      <Tooltip content={tooltipContent} position="top" mini>
        <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>
          {button}
        </span>
      </Tooltip>
    );
  }

  return button;
}

'use client';

import { useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCardStore } from '@/stores/cardStore';
import { classifyInput } from '@/lib/input-classifier';
import { CardData, CardError } from '@/types/card';
import InputPanel from '@/components/InputPanel';
import CardResult from '@/components/CardResult';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import ErrorState from '@/components/shared/ErrorState';

/**
 * Inner page component — reads URL search params.
 * Separated from the outer component so Suspense can wrap useSearchParams().
 */
function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    inputValue,
    setInputValue,
    inputType,
    setInputType,
    cardData,
    setCardData,
    isLoading,
    setLoading,
    error,
    setError,
  } = useCardStore();

  // Track whether we've already triggered an auto-translate on mount for the URL q param
  const autoTranslateTriggered = useRef(false);

  /**
   * Core translate function.
   * Classifies input, updates URL, calls API, updates store.
   */
  const translate = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const type = classifyInput(trimmed);
    setInputValue(trimmed);
    setInputType(type);
    setError(null);

    // Sync URL without page navigation
    const params = new URLSearchParams();
    params.set('q', trimmed);
    params.set('type', type);
    router.replace(`/?${params.toString()}`);

    setLoading(true);

    try {
      const res = await fetch('/api/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed, inputType: type }),
      });

      const json = await res.json();

      if (json.success) {
        setCardData(json.data as CardData);
      } else {
        setCardData(null as unknown as CardData);
        const err: CardError = {
          type: json.errorCode ?? 'unknown',
          message: json.message ?? '出现了未知错误',
          retryable: json.retryable ?? true,
        };
        setError(err);
      }
    } catch (fetchErr) {
      console.error('[page] fetch error:', fetchErr);
      setError({
        type: 'network',
        message: '网络连接中断，请检查网络后重试',
        retryable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [router, setInputValue, setInputType, setError, setLoading, setCardData]);

  // On mount: if URL has ?q=, auto-trigger translation
  useEffect(() => {
    if (autoTranslateTriggered.current) return;
    const q = searchParams.get('q');
    if (q && q.trim() && /[a-zA-Z]/.test(q)) {
      autoTranslateTriggered.current = true;
      translate(q.trim());
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasResult = !isLoading && !error && cardData;
  const hasError = !isLoading && !!error;

  // Center input vertically only when there is no result/loading/error below
  const isInitialState = !isLoading && !error && !cardData;

  return (
    <div
      className="page-outer"
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-1)',
        display: 'flex',
        alignItems: isInitialState ? 'center' : 'flex-start',
        justifyContent: 'center',
        paddingTop: isInitialState ? 'var(--spacing-10)' : 'var(--spacing-6)',
        paddingBottom: isInitialState ? 'var(--spacing-10)' : 'var(--spacing-6)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680 }}>
        {/* Input panel — always visible */}
        <InputPanel
          onSubmit={translate}
          isLoading={isLoading}
          initialValue={inputValue || searchParams.get('q') || ''}
        />

        {/* Loading state */}
        {isLoading && <LoadingSkeleton />}

        {/* Error state */}
        {hasError && error && (
          <ErrorState
            errorType={error.type}
            onRetry={() => {
              if (inputValue) translate(inputValue);
            }}
          />
        )}

        {/* Result state */}
        {hasResult && cardData && (
          <CardResult
            data={cardData}
            inputType={inputType ?? cardData.inputType}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Root page — wraps inner component in Suspense as required by Next.js 14
 * when using useSearchParams() in a Client Component.
 */
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}

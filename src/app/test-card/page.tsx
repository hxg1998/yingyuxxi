'use client';

/**
 * Development-only test page to preview CardResult with mock data.
 * Access at http://localhost:3000/test-card
 * Remove this page before production deployment.
 */
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import CardResult from '@/components/CardResult';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { CardData } from '@/types/card';

export default function TestCardPage() {
  // Dev-only page: hidden in production.
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [cardData, setCardData] = useState<CardData | null>(null);

  useEffect(() => {
    fetch('/api/mock-card')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCardData(json.data);
      });
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-1)',
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680 }}>
        <p style={{ color: 'var(--color-text-3)', fontSize: 12, marginBottom: 16 }}>
          [Dev preview — CardResult with mock &quot;alignment&quot; data]
        </p>
        {!cardData && <LoadingSkeleton />}
        {cardData && <CardResult data={cardData} inputType="word" />}
      </div>
    </div>
  );
}

/**
 * useAutoSave.ts — Auto-save hook for the Review Library (v0.7.0)
 *
 * After a card is successfully generated, call saveCardToReview(cardData).
 * It handles dedup logic and returns what action was taken so the caller
 * can show the appropriate Toast or confirmation modal.
 *
 * Now async: saveCard() talks to Supabase, not localStorage.
 */

'use client';

import { useCallback } from 'react';
import { Message, Modal } from '@arco-design/web-react';
import { CardData } from '@/types/card';
import { saveCard, reactivateMasteredCard } from './review-store';

export function useAutoSave() {
  const saveCardToReview = useCallback(async (cardData: CardData) => {
    const result = await saveCard(cardData);

    if (result.status === 'error') {
      Message.error({
        content: `保存失败：${result.message}`,
        duration: 5000,
      });
      return;
    }

    if (result.status === 'mastered') {
      // Existing word is marked mastered — ask user
      Modal.confirm({
        title: `「${cardData.originalInput}」已标记为已掌握`,
        content: '是否将它重新加入复习队列？',
        okText: '确认，重新加入队列',
        cancelText: '取消，保持已掌握',
        okButtonProps: { type: 'primary' },
        onOk: async () => {
          const normalizedText = cardData.originalInput.trim().toLowerCase();
          const ok = await reactivateMasteredCard(normalizedText);
          if (ok) {
            Message.success({ content: '已重新加入复习队列', duration: 2000 });
          } else {
            Message.error({ content: '操作失败，请重试', duration: 3000 });
          }
        },
      });
      return;
    }

    if (result.status === 'created') {
      Message.success({ content: '已保存到复习库', duration: 2000 });
    } else if (result.status === 'updated') {
      Message.success({
        content: `已保存（第 ${result.queryCount} 次查此词）`,
        duration: 2000,
      });
    }
  }, []);

  return { saveCardToReview };
}

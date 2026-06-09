/**
 * useAutoSave.ts — Auto-save hook for the Review Library (v0.4.0)
 *
 * After a card is successfully generated, call saveCardToReview(cardData).
 * It handles dedup logic and returns what action was taken so the caller
 * can show the appropriate Toast or confirmation modal.
 */

'use client';

import { useCallback } from 'react';
import { Message, Modal } from '@arco-design/web-react';
import { CardData } from '@/types/card';
import { saveCard, reactivateMasteredCard } from './review-store';

export function useAutoSave() {
  const saveCardToReview = useCallback((cardData: CardData) => {
    const result = saveCard(cardData);

    if (result.status === 'quota_exceeded') {
      Message.error({
        content: '存储空间已满，请先导出备份并清理部分旧卡片',
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
        onOk: () => {
          const normalizedText = cardData.originalInput.trim().toLowerCase();
          reactivateMasteredCard(normalizedText);
          Message.success({ content: '已重新加入复习队列', duration: 2000 });
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

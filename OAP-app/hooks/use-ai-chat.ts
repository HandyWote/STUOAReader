import { useCallback, useState } from 'react';

import type { RelatedArticle } from '@/types/article';
import { askAi } from '@/services/ai';
import { extractKeywords } from '@/utils/text';

export type ChatMessage = {
  id: string;
  isUser: boolean;
  text: string;
  highlights?: string[];
  related?: RelatedArticle[];
};

export function useAiChat(token?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const setMessageText = useCallback((id: string, text: string) => {
    setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  }, []);

  const updateRelated = useCallback((id: string, related: RelatedArticle[]) => {
    setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, related } : item)));
  }, []);

  const sendChat = useCallback(
    async (question: string) => {
      if (!question.trim() || isThinking) {
        return;
      }
      const highlights = extractKeywords(question);
      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        isUser: true,
        text: question,
      };
      const aiMessageId = `a-${Date.now()}`;
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        isUser: false,
        text: '',
        highlights,
      };
      setMessages((prev) => [...prev, userMessage, aiMessage]);
      setIsThinking(true);

      try {
        if (!token) {
          throw new Error('missing token');
        }
        const result = await askAi(question, token);
        const answer = result.answer || '抱歉，当前服务不可用，请稍后再试。';
        setMessageText(aiMessageId, answer);
        if (result.related_articles?.length) {
          updateRelated(aiMessageId, result.related_articles);
        }
      } catch {
        setMessageText(aiMessageId, '抱歉，当前服务不可用，请稍后再试。');
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, setMessageText, token, updateRelated]
  );

  return {
    messages,
    isThinking,
    sendChat,
    setMessages,
  };
}

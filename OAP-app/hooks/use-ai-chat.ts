// AI 聊天功能 Hook
// 主要功能：管理 AI 对话状态，包括消息列表、发送消息、加载状态和相关文章推荐
// 支持用户消息和 AI 消息的区分，以及关键词提取和相关文章关联

import { useCallback, useState } from 'react';

import type { RelatedArticle } from '@/types/article';
import { askAi } from '@/services/ai';
import { extractKeywords } from '@/utils/text';

// 聊天消息类型定义
export type ChatMessage = {
  id: string; // 消息唯一标识
  isUser: boolean; // 是否为用户消息（true：用户，false：AI）
  text: string; // 消息文本内容
  highlights?: string[]; // 关键词高亮列表
  related?: RelatedArticle[]; // 相关文章推荐列表
};

// AI 聊天 Hook
export function useAiChat(token?: string | null) {
  // 消息列表状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // AI 思考状态（true：正在生成回复）
  const [isThinking, setIsThinking] = useState(false);

  // 更新消息文本内容
  const setMessageText = useCallback((id: string, text: string) => {
    setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  }, []);

  // 更新消息的相关文章
  const updateRelated = useCallback((id: string, related: RelatedArticle[]) => {
    setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, related } : item)));
  }, []);

  // 发送聊天消息
  const sendChat = useCallback(
    async (question: string) => {
      // 空消息或正在思考时不处理
      if (!question.trim() || isThinking) {
        return;
      }
      // 提取问题中的关键词
      const highlights = extractKeywords(question);
      // 创建用户消息
      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`, // 用户消息 ID 前缀为 u-
        isUser: true,
        text: question,
      };
      // 创建 AI 消息占位符
      const aiMessageId = `a-${Date.now()}`; // AI 消息 ID 前缀为 a-
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        isUser: false,
        text: '', // 初始为空，后续更新
        highlights, // 关联关键词
      };
      // 添加消息到列表
      setMessages((prev) => [...prev, userMessage, aiMessage]);
      setIsThinking(true); // 开始思考

      try {
        // 检查认证令牌
        if (!token) {
          throw new Error('missing token');
        }
        // 调用 AI 服务获取回复
        const result = await askAi(question, token);
        // 获取 AI 回复文本
        const answer = result.answer || '抱歉，当前服务不可用，请稍后再试。';
        // 更新 AI 消息文本
        setMessageText(aiMessageId, answer);
        // 如果有相关文章，更新到消息中
        if (result.related_articles?.length) {
          updateRelated(aiMessageId, result.related_articles);
        }
      } catch {
        // 错误处理：显示错误提示
        setMessageText(aiMessageId, '抱歉，当前服务不可用，请稍后再试。');
      } finally {
        setIsThinking(false); // 结束思考状态
      }
    },
    [isThinking, setMessageText, token, updateRelated]
  );

  // 返回聊天状态和操作方法
  return {
    messages, // 消息列表
    isThinking, // AI 思考状态
    sendChat, // 发送消息方法
    setMessages, // 设置消息列表方法
  };
}

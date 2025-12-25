// 聊天消息组件
// 主要功能：展示用户和AI助手的对话消息，支持Markdown渲染和不同样式的消息气泡
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ChatMessage } from '@/hooks/use-ai-chat';
import { colors } from '@/constants/palette';

// 聊天消息属性类型
type ChatMessageProps = {
  message: ChatMessage; // 消息数据
  renderMarkdown: (content: string) => React.ReactNode; // Markdown渲染函数
};

export function ChatMessageItem({ message, renderMarkdown }: ChatMessageProps) {
  return (
    <View
      style={[
        styles.messageWrap,
        message.isUser ? styles.messageRight : styles.messageLeft,
      ]}
    >
      <Text style={styles.messageLabel}>{message.isUser ? 'ME' : 'AI ASSISTANT'}</Text>
      <View
        style={[
          styles.messageBubble,
          message.isUser ? styles.messageUser : styles.messageAi,
        ]}
      >
        {!message.isUser && <View style={styles.aiLine} />}
        {message.isUser && <View style={styles.userLine} />}
        {message.isUser ? (
          <Text style={styles.messageText}>{message.text}</Text>
        ) : (
          renderMarkdown(message.text || ' ')
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 消息外层容器样式
  messageWrap: {
    gap: 8,
  },
  // 右对齐样式（用户消息）
  messageRight: {
    alignItems: 'flex-end',
  },
  // 左对齐样式（AI消息）
  messageLeft: {
    alignItems: 'flex-start',
  },
  // 消息标签样式（ME/AI ASSISTANT）
  messageLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.stone300,
  },
  // 消息气泡样式
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // 用户消息气泡样式：深色背景，右下角小圆角
  messageUser: {
    backgroundColor: colors.stone800,
    borderBottomRightRadius: 6,
  },
  // AI消息气泡样式：白色半透明背景，左下角小圆角
  messageAi: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },
  // 消息文本样式
  messageText: {
    color: colors.gold50,
    fontSize: 14,
    lineHeight: 20,
  },
  // AI消息气泡左侧金色装饰线
  aiLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: colors.gold400,
  },
  // 用户消息气泡右侧紫色装饰线
  userLine: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    backgroundColor: colors.imperial600,
  },
});

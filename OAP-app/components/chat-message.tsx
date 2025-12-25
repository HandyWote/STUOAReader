import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ChatMessage } from '@/types/chat';
import { colors } from '@/constants/palette';
import { ThinkingIndicator } from '@/components/thinking-indicator';

type ChatMessageProps = {
  message: ChatMessage;
  renderMarkdown: (content: string) => React.ReactNode;
  isThinking?: boolean;
};

export function ChatMessageItem({ message, renderMarkdown, isThinking }: ChatMessageProps) {
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
        ) : isThinking ? (
          <ThinkingIndicator />
        ) : (
          renderMarkdown(message.text || ' ')
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageWrap: {
    gap: 8,
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.stone300,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  messageUser: {
    backgroundColor: colors.stone800,
    borderBottomRightRadius: 6,
  },
  messageAi: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    color: colors.gold50,
    fontSize: 14,
    lineHeight: 20,
  },
  aiLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: colors.gold400,
  },
  userLine: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    backgroundColor: colors.imperial600,
  },
});

// 聊天输入框组件
// 主要功能：提供文本输入区域和发送按钮，用于用户与AI对话
import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArrowUp } from 'phosphor-react-native';

import { colors } from '@/constants/palette';

// 聊天输入框属性类型
type ChatInputProps = {
  value: string; // 输入框的当前值
  onChangeText: (value: string) => void; // 输入文本变更回调
  onSend: () => void; // 发送消息回调
};

export function ChatInput({ value, onChangeText, onSend }: ChatInputProps) {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputShell}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="输入指令..."
          placeholderTextColor={colors.stone400}
          style={styles.input}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <Pressable style={styles.sendButton} onPress={onSend}>
          <ArrowUp size={16} color={colors.white} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 输入框外层容器样式：左右边距和底部边距
  inputWrap: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  // 输入框外壳样式：圆角容器，白色半透明背景
  inputShell: {
    borderRadius: 26,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  // 文本输入框样式
  input: {
    paddingLeft: 16,
    paddingRight: 56,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.stone800,
  },
  // 发送按钮样式：圆形按钮，紫色背景
  sendButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.imperial600,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.imperial600,
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 0px 10px rgba(155, 28, 28, 0.3)',
      },
    }),
  },
});

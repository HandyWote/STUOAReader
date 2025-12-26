import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArrowUp } from 'phosphor-react-native';

import { colors } from '@/constants/palette';
import { shadows } from '@/constants/shadows';

type ChatInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
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
  inputWrap: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  inputShell: {
    borderRadius: 26,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  input: {
    paddingLeft: 16,
    paddingRight: 56,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.stone800,
  },
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
    ...shadows.glowImperialStrong,
  },
});

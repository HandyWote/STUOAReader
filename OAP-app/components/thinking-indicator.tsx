// 思考指示器组件
// 主要功能：显示AI正在思考的状态，包含图标、文字和加载动画
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Sparkle } from 'phosphor-react-native';

import { colors } from '@/constants/palette';

export function ThinkingIndicator() {
  return (
    <View style={styles.thinkingRow}>
      <View style={styles.thinkingBadge}>
        <Sparkle size={12} color={colors.gold500} weight="fill" />
      </View>
      <Text style={styles.thinkingText}>THINKING...</Text>
      <ActivityIndicator size="small" color={colors.gold500} />
    </View>
  );
}

const styles = StyleSheet.create({
  // 思考指示器行样式：横向排列
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // 思考徽章样式：圆形容器
  thinkingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 思考文字样式
  thinkingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.gold500,
  },
});

// 首页加载状态组件
// 主要功能：显示加载动画和提示文字，用于数据加载过程中
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/palette';

export function HomeLoadingState() {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="small" color={colors.gold500} />
      <Text style={styles.loadingText}>正在加载今日要闻</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 加载容器样式：居中排列，上方边距120
  loadingWrap: {
    marginTop: 120,
    alignItems: 'center',
    gap: 10,
  },
  // 加载文字样式
  loadingText: {
    fontSize: 12,
    color: colors.stone500,
  },
});

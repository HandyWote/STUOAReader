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
  loadingWrap: {
    marginTop: 120,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.stone500,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Crown } from 'phosphor-react-native';

import { colors } from '@/constants/palette';

export function HomeEmptyState() {
  return (
    <View style={styles.emptyState}>
      <Crown size={36} color={colors.gold400} weight="fill" />
      <Text style={styles.emptyTitle}>今日暂无新通知</Text>
      <Text style={styles.emptySub}>保持关注，稍后再来看看</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.stone800,
  },
  emptySub: {
    fontSize: 12,
    color: colors.stone400,
  },
});

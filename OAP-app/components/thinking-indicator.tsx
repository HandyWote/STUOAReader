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
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thinkingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.gold500,
  },
});

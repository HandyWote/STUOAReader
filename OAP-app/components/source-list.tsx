import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RelatedArticle } from '@/types/article';
import { colors } from '@/constants/palette';
import { SourceCard } from '@/components/source-card';

type SourceListProps = {
  related: RelatedArticle[];
  highlights: string[];
  expanded: boolean;
  onToggle: () => void;
  onOpenArticle: (article: RelatedArticle) => void;
};

export function SourceList({
  related,
  highlights,
  expanded,
  onToggle,
  onOpenArticle,
}: SourceListProps) {
  return (
    <View style={styles.sourceWrap}>
      <Pressable onPress={onToggle} style={styles.sourceHeaderRow}>
        <Text style={styles.sourceTitle}>引用材料</Text>
        <Text style={styles.sourceToggle}>{expanded ? '收起' : '展开'}</Text>
      </Pressable>
      {expanded &&
        related.map((article) => (
          <SourceCard
            key={article.id}
            article={article}
            highlights={highlights}
            onPress={onOpenArticle}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sourceWrap: {
    marginTop: 6,
    width: '100%',
    gap: 12,
  },
  sourceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.stone600,
  },
  sourceToggle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold500,
  },
});

// 来源列表组件
// 主要功能：展示相关文章列表，支持展开/收起功能，每篇文章以卡片形式展示
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RelatedArticle } from '@/types/article';
import { colors } from '@/constants/palette';
import { SourceCard } from '@/components/source-card';

// 来源列表属性类型
type SourceListProps = {
  related: RelatedArticle[]; // 相关文章列表
  highlights: string[]; // 需要高亮的关键词列表
  expanded: boolean; // 是否展开
  onToggle: () => void; // 展开/收起切换回调
  onOpenArticle: (article: RelatedArticle) => void; // 打开文章详情回调
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
      // 展开状态时渲染所有来源卡片
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
  // 来源列表容器样式
  sourceWrap: {
    marginTop: 6,
    width: '100%',
    gap: 12,
  },
  // 来源标题行样式：包含标题和展开/收起按钮
  sourceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 来源标题样式
  sourceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.stone600,
  },
  // 展开/收起按钮样式
  sourceToggle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold500,
  },
});

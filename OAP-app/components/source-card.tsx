// 来源卡片组件
// 主要功能：展示相关文章的标题、标签、日期和摘要片段，支持高亮显示关键词
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RelatedArticle } from '@/types/article';
import { colors } from '@/constants/palette';
import { splitHighlightedText } from '@/utils/text';

// 来源卡片属性类型
type SourceCardProps = {
  article: RelatedArticle; // 相关文章数据
  highlights: string[]; // 需要高亮的关键词列表
  onPress: (article: RelatedArticle) => void; // 点击回调函数
};

// 构建摘要片段文本的辅助函数
function buildSnippet(article: RelatedArticle) {
  return article.content_snippet || article.summary_snippet || '';
}

export function SourceCard({ article, highlights, onPress }: SourceCardProps) {
  return (
    <Pressable style={styles.sourceCard} onPress={() => onPress(article)}>
      <View style={styles.sourceHeader}>
        <Text style={styles.sourceTag}>{article.unit || '公告'}</Text>
        <Text style={styles.sourceDate}>{article.published_on || '--'}</Text>
      </View>
      <Text style={styles.sourceTitleText}>{article.title}</Text>
      <Text style={styles.snippetText}>
        // 使用工具函数分割文本并高亮匹配的关键词
        {splitHighlightedText(buildSnippet(article), highlights).map((part, index) => (
          <Text
            key={`${article.id}-snippet-${index}`}
            style={part.isMatch ? styles.snippetHighlight : undefined}
          >
            {part.value}
          </Text>
        ))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 来源卡片容器样式：圆角白色背景
  sourceCard: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone100,
    gap: 6,
  },
  // 来源头部样式：标签和日期横向排列
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // 来源标签样式
  sourceTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.imperial600,
  },
  // 来源日期样式
  sourceDate: {
    fontSize: 10,
    color: colors.stone300,
  },
  // 来源标题样式
  sourceTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.stone800,
  },
  // 摘要文本样式
  snippetText: {
    fontSize: 12,
    color: colors.stone500,
    lineHeight: 18,
  },
  // 摘要高亮样式：紫色加粗
  snippetHighlight: {
    color: colors.imperial600,
    fontWeight: '700',
  },
});

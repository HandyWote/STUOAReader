// 文章详情弹窗组件
// 主要功能：以底部抽屉形式展示文章详情，包含标题、发布单位、发布时间、AI摘要和正文内容
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, // 动画值
  Dimensions, // 屏幕尺寸
  Modal, // 模态框
  Pressable, // 可按压组件
  ScrollView, // 滚动视图
  StyleSheet, // 样式表
  Text, // 文本组件
  View, // 视图组件
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // 线性渐变
import { Buildings, Sparkle, X } from 'phosphor-react-native'; // 图标组件

import { colors } from '@/constants/palette'; // 颜色常量
import type { Article, ArticleDetail } from '@/types/article'; // 类型定义

// 文章详情弹窗属性类型
type ArticleDetailSheetProps = {
  visible: boolean; // 弹窗可见性
  article: Article | null; // 文章基本信息
  detail: ArticleDetail | null; // 文章详细信息
  onClose: () => void; // 关闭回调函数
};

// 获取屏幕高度
const screenHeight = Dimensions.get('window').height;

// 段落文本规范化函数
// 功能：清理和标准化文本段落，去除多余空格和换行
function normalizeParagraphs(text: string) {
  if (!text) {
    return '';
  }
  const normalized = text
    .replace(/\r\n/g, '\n') // 统一换行符
    .replace(/[ \t]+/g, ' ') // 合并多余空格和制表符
    .replace(/\n{3,}/g, '\n\n') // 限制连续换行不超过2个
    .replace(/([^\n])\n([^\n])/g, '$1 $2') // 合并单行换行
    .trim(); // 去除首尾空白
  return normalized;
}

// 文章详情弹窗组件
export function ArticleDetailSheet({
  visible,
  article,
  detail,
  onClose,
}: ArticleDetailSheetProps) {
  // 抽屉动画值（用于从底部滑入/滑出）
  const sheetAnim = useRef(new Animated.Value(screenHeight)).current;
  // 组件挂载状态（用于控制模态框的渲染）
  const [mounted, setMounted] = useState(visible);

  // 根据可见性控制抽屉动画
  useEffect(() => {
    if (visible) {
      // 显示时：挂载组件并从底部滑入
      setMounted(true);
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start();
    } else {
      // 隐藏时：滑出到底部，动画完成后卸载组件
      Animated.timing(sheetAnim, {
        toValue: screenHeight,
        duration: 320,
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
      });
    }
  }, [sheetAnim, visible]);

  // 显示的摘要文本（优先使用详情摘要，其次文章摘要，最后显示默认文本）
  const displaySummary = detail?.summary || article?.summary || '暂无摘要';
  // 显示的正文内容（规范化处理后）
  const displayContent = useMemo(() => {
    const normalized = normalizeParagraphs(detail?.content || '');
    return normalized || '暂无正文内容，稍后再试。';
  }, [detail?.content]);

  // 未挂载时不渲染任何内容
  if (!mounted) {
    return null;
  }

  return (
    // 模态框容器（透明背景，无默认动画）
    <Modal transparent visible={mounted} animationType="none">
      <View style={styles.sheetOverlay}>
        // 点击背景关闭弹窗
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        // 抽屉容器（带滑入动画）
        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: sheetAnim }] },
          ]}
        >
          // 顶部拖拽指示条
          <View style={styles.sheetHandle} />
          // 关闭按钮
          <Pressable style={styles.sheetClose} onPress={onClose}>
            <X size={16} color={colors.stone500} weight="bold" />
          </Pressable>
          // 可滚动的内容区域
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            // 文章头部：发布单位图标和日期
            <View style={styles.detailHeader}>
              <View style={styles.detailIcon}>
                <Buildings size={20} color={colors.imperial600} weight="fill" />
              </View>
              <View>
                <Text style={styles.detailUnit}>{article?.unit || '公告'}</Text>
                <Text style={styles.detailDate}>{article?.published_on || '--'}</Text>
              </View>
            </View>

            // 文章标题
            <Text style={styles.detailTitle}>{article?.title || ''}</Text>

            // AI摘要卡片（深色渐变背景）
            <LinearGradient
              colors={[colors.stone900, colors.stone800]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiCard}
            >
              // 顶部金色装饰线
              <View style={styles.aiLine} />
              // AI徽章行
              <View style={styles.aiBadgeRow}>
                <Sparkle size={14} color={colors.gold300} weight="fill" />
                <Text style={styles.aiBadge}>AI SUMMARY</Text>
              </View>
              // AI摘要文本
              <Text style={styles.aiText}>{displaySummary}</Text>
            </LinearGradient>

            // 正文内容区域
            <View style={styles.detailContentWrap}>
              <Text style={styles.detailLead}>各部门、各单位：</Text>
              <Text style={styles.detailContent}>{displayContent}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// 样式定义
const styles = StyleSheet.create({
  // 抽屉遮罩层样式：占满屏幕，内容靠底部对齐
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // 背景遮罩层样式：半透明黑色
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.4)',
  },
  // 抽屉容器样式：屏幕高度的90%，顶部圆角
  sheetContainer: {
    height: screenHeight * 0.9,
    backgroundColor: '#FFFEFC',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
  },
  // 顶部拖拽指示条样式
  sheetHandle: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.stone200,
    zIndex: 2,
  },
  // 关闭按钮样式
  sheetClose: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.stone100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 内容区域样式
  sheetContent: {
    paddingTop: 48,
    paddingHorizontal: 26,
    paddingBottom: 40,
  },
  // 文章头部样式：包含图标和日期
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  // 文章图标容器样式
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.imperial50,
    borderWidth: 1,
    borderColor: colors.imperial100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  // 发布单位标签样式
  detailUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.stone400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  // 发布日期样式
  detailDate: {
    marginTop: 2,
    fontSize: 10,
    color: colors.stone300,
  },
  // 文章标题样式
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.stone900,
    lineHeight: 30,
    marginBottom: 18,
  },
  // AI摘要卡片样式
  aiCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
  },
  // AI卡片顶部金色装饰线样式
  aiLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.gold400,
  },
  // AI徽章行样式：图标和徽章文本
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  // AI徽章文本样式
  aiBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.gold300,
  },
  // AI摘要文本样式
  aiText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#E7E2D8',
  },
  // 正文内容容器样式
  detailContentWrap: {
    marginTop: 4,
  },
  // 正文开头样式
  detailLead: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.stone900,
    marginBottom: 8,
  },
  // 正文内容样式
  detailContent: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.stone600,
  },
});

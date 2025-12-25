/**
 * 首页 - 今日要闻列表页面
 * 核心功能：
 * 1. 展示今日要闻文章列表
 * 2. 支持下拉刷新获取最新文章
 * 3. 点击文章查看详情
 * 4. 标记所有文章为已读
 * 5. 显示文章阅读状态、附件数量、优先级
 * 6. 滚动状态检测与顶部栏样式适配
 * 7. 加载状态和空状态处理
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context'

import { useRouter } from 'expo-router';

// 导入自定义组件
import { ArticleDetailSheet } from '@/components/article-detail-sheet'; // 文章详情弹窗
import { ArticleCard } from '@/components/article-card'; // 文章卡片组件
import { AmbientBackground } from '@/components/ambient-background'; // 背景效果组件
import { BottomDock } from '@/components/bottom-dock'; // 底部导航栏
import { HomeEmptyState } from '@/components/home-empty-state'; // 空状态组件
import { HomeLoadingState } from '@/components/home-loading-state'; // 加载状态组件
import { TopBar } from '@/components/top-bar'; // 顶部栏组件

// 导入常量和工具
import { colors } from '@/constants/palette'; // 颜色常量
import { useArticles } from '@/hooks/use-articles'; // 文章数据管理钩子
import { useAuthToken } from '@/hooks/use-auth-token'; // 认证令牌钩子
import { formatDateLabel } from '@/utils/date'; // 日期格式化工具
import { getAttachmentsCount, getPriority } from '@/utils/article'; // 文章工具函数

// 导入类型定义
import type { Article } from '@/types/article'; // 文章类型

/**
 * 首页组件
 */
export default function HomeScreen() {
  // 路由实例，用于页面跳转
  const router = useRouter();
  // 滚动状态（用于顶部栏样式变化）
  const [isScrolled, setIsScrolled] = useState(false);

  // 渐入动画值
  const fadeIn = useRef(new Animated.Value(0)).current;

  // 页面标题
  const pageTitle = '今日要闻';
  // 当前日期标签（格式化显示）
  const currentDate = useMemo(() => formatDateLabel(), []);

  // 获取认证令牌
  const token = useAuthToken();
  // 使用文章数据钩子，获取文章列表和相关操作
  const {
    articles, // 文章列表
    isLoading, // 加载状态
    isRefreshing, // 刷新状态
    activeArticle, // 当前激活的文章
    activeDetail, // 当前激活文章的详细信息
    sheetVisible, // 文章详情弹窗可见性
    readIds, // 已读文章ID集合
    loadArticles, // 加载文章数据
    refreshArticles, // 刷新文章数据
    openArticle, // 打开文章详情
    closeArticle, // 关闭文章详情
    markAllRead, // 标记所有文章为已读
    hasUnread, // 是否有未读文章
  } = useArticles(token);

  /**
   * 加载文章数据并播放渐入动画
   */
  const loadArticlesWithFade = useCallback(async () => {
    await loadArticles();
    // 播放渐入动画
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeIn, loadArticles]);

  // 组件挂载时加载文章数据
  useEffect(() => {
    loadArticlesWithFade();
  }, [loadArticlesWithFade]);

  /**
   * 渲染文章列表项
   * @param item - 文章数据
   * @param index - 索引
   * @returns 文章卡片组件
   */
  const renderItem = useCallback(
    ({ item, index }: { item: Article; index: number }) => {
      // 获取附件数量
      const attachmentsCount = getAttachmentsCount(item.attachments);
      // 获取文章优先级
      const priority = getPriority(item.title);
      // 判断文章是否已读
      const isRead = !!readIds[item.id];
      return (
        <ArticleCard
          article={item}
          index={index}
          isRead={isRead}
          attachmentsCount={attachmentsCount}
          priority={priority}
          onPress={openArticle}
        />
      );
    },
    [openArticle, readIds]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {/* 背景效果 */}
      <AmbientBackground variant="home" />
      {/* 顶部栏组件 */}
      <TopBar
        variant="home"
        title={pageTitle}
        dateText={currentDate}
        isScrolled={isScrolled} // 传递滚动状态
        hasUnread={hasUnread} // 传递是否有未读文章
        onPressAction={markAllRead} // 传递标记所有已读的回调
      />

      {/* 文章列表容器（带渐入动画） */}
      <Animated.View style={[styles.listWrap, { opacity: fadeIn }]}>
        {/* 加载状态 */}
        {isLoading ? (
          <HomeLoadingState />
        ) : (
          /* 文章列表 */
          <FlatList
            data={articles} // 文章数据
            keyExtractor={(item) => item.id.toString()} // 唯一键
            renderItem={renderItem} // 渲染列表项
            contentContainerStyle={styles.listContent} // 内容容器样式
            showsVerticalScrollIndicator={false} // 隐藏垂直滚动条
            // 检测滚动状态
            onScroll={(event) => setIsScrolled(event.nativeEvent.contentOffset.y > 20)}
            scrollEventThrottle={16} // 滚动事件触发频率（毫秒）
            // 下拉刷新控制
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refreshArticles}
                tintColor={colors.gold500}
              />
            }
            // 空状态组件
            ListEmptyComponent={
              <HomeEmptyState />
            }
          />
        )}
      </Animated.View>

      {/* 底部导航栏 */}
      <BottomDock
        activeTab="home"
        onHome={() => undefined}
        onAi={() => router.push('/(tabs)/explore')}
        onSettings={() => router.push('/(tabs)/settings')}
      />

      {/* 文章详情弹窗 */}
      <ArticleDetailSheet
        visible={sheetVisible}
        article={activeArticle}
        detail={activeDetail}
        onClose={closeArticle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  listWrap: {
    flex: 1,
    paddingTop: 110, // 顶部栏高度
  },
  listContent: {
    paddingHorizontal: 20, // 左右边距
    paddingBottom: 130, // 底部边距（为底部导航栏留出空间）
  },
});

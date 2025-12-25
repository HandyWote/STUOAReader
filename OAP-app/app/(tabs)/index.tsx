
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

import { ArticleDetailSheet } from '@/components/article-detail-sheet';
import { ArticleCard } from '@/components/article-card';
import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { HomeEmptyState } from '@/components/home-empty-state';
import { HomeLoadingState } from '@/components/home-loading-state';
import { TopBar } from '@/components/top-bar';

import { colors } from '@/constants/palette';
import { useArticles } from '@/hooks/use-articles';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatDateLabel } from '@/utils/date';
import { getAttachmentsCount, getPriority } from '@/utils/article';

import type { Article } from '@/types/article';

export default function HomeScreen() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const pageTitle = '今日要闻';
  const currentDate = useMemo(() => formatDateLabel(), []);

  const token = useAuthToken();
  const {
    articles,
    isLoading,
    isRefreshing,
    activeArticle,
    activeDetail,
    sheetVisible,
    readIds,
    loadArticles,
    refreshArticles,
    openArticle,
    closeArticle,
    markAllRead,
    hasUnread,
  } = useArticles(token);

  const loadArticlesWithFade = useCallback(async () => {
    await loadArticles();
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeIn, loadArticles]);

  useEffect(() => {
    loadArticlesWithFade();
  }, [loadArticlesWithFade]);

  const renderItem = useCallback(
    ({ item, index }: { item: Article; index: number }) => {
      const attachmentsCount = getAttachmentsCount(item.attachments);
      const priority = getPriority(item.title);
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
      <AmbientBackground variant="home" />
      <TopBar
        variant="explore"
        title={pageTitle}
        dateText={currentDate}
        isScrolled={isScrolled}
        hasUnread={hasUnread}
        onPressAction={markAllRead}
      />

      <Animated.View style={[styles.listWrap, { opacity: fadeIn }]}>
        {isLoading ? (
          <HomeLoadingState />
        ) : (
          <FlatList
            data={articles}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => setIsScrolled(event.nativeEvent.contentOffset.y > 20)}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refreshArticles}
                tintColor={colors.gold500}
              />
            }
            ListEmptyComponent={
              <HomeEmptyState />
            }
          />
        )}
      </Animated.View>

      <BottomDock
        activeTab="home"
        onHome={() => undefined}
        onAi={() => router.push('/(tabs)/explore')}
        onSettings={() => router.push('/(tabs)/settings')}
      />

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
    paddingTop: 110,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  Bell,
  Crown,
  Paperclip,
} from 'phosphor-react-native';

import { ArticleDetailSheet } from '@/components/article-detail-sheet';
import { BottomDock } from '@/components/bottom-dock';
import { colors } from '@/constants/palette';
import type { Article, ArticleDetail } from '@/types/article';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

function formatDateLabel() {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      weekday: 'long',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString();
  }
}

function formatTimeLabel(iso?: string) {
  if (!iso) {
    return '--:--';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function getAttachmentsCount(value: unknown) {
  if (!value) {
    return 0;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

function getPriority(title: string) {
  if (!title) {
    return 'normal';
  }
  if (title.includes('紧急') || title.includes('重要')) {
    return 'high';
  }
  return 'normal';
}

export default function HomeScreen() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [activeDetail, setActiveDetail] = useState<ArticleDetail | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [readIds, setReadIds] = useState<Record<number, boolean>>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const pageTitle = '今日要闻';
  const currentDate = useMemo(() => formatDateLabel(), []);

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync('access_token').then((value) => {
      if (mounted) {
        setToken(value);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchArticles = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const resp = await fetch(`${apiBaseUrl}/articles/`, { headers });
    if (!resp.ok) {
      throw new Error('articles fetch failed');
    }
    const data = await resp.json();
    const list = Array.isArray(data?.articles) ? data.articles : [];
    return list as Article[];
  }, [token]);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchArticles();
      setArticles(list);
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch {
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [fadeIn, fetchArticles]);

  const refreshArticles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const list = await fetchArticles();
      setArticles(list);
    } catch {
      setArticles([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchArticles]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const openArticle = useCallback(
    async (article: Article) => {
      setActiveArticle(article);
      setSheetVisible(true);
      setReadIds((prev) => ({ ...prev, [article.id]: true }));

      setActiveDetail(null);
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const resp = await fetch(`${apiBaseUrl}/articles/${article.id}`, { headers });
        if (!resp.ok) {
          return;
        }
        const detail = (await resp.json()) as ArticleDetail;
        setActiveDetail(detail);
      } catch {
        setActiveDetail(null);
      }
    },
    [token]
  );

  const closeArticle = useCallback(() => {
    setSheetVisible(false);
    setActiveArticle(null);
    setActiveDetail(null);
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next: Record<number, boolean> = { ...prev };
      articles.forEach((article) => {
        next[article.id] = true;
      });
      return next;
    });
  }, [articles]);

  const hasUnread = useMemo(
    () => articles.some((article) => !readIds[article.id]),
    [articles, readIds]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Article; index: number }) => {
      const attachmentsCount = getAttachmentsCount(item.attachments);
      const priority = getPriority(item.title);
      const isRead = !!readIds[item.id];
      return (
        <Pressable
          onPress={() => openArticle(item)}
          style={({ pressed }) => [
            styles.cardPressable,
            pressed && styles.cardPressed,
            index === 0 && { marginTop: 8 },
          ]}
        >
          <LinearGradient
            colors={[colors.white, '#F7F4EF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardGlow} />
            <View style={styles.cardHeader}>
              <View style={styles.cardMetaLeft}>
                <View
                  style={[
                    styles.tag,
                    priority === 'high' ? styles.tagHigh : styles.tagNormal,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      priority === 'high' ? styles.tagTextHigh : styles.tagTextNormal,
                    ]}
                  >
                    {item.unit || '公告'}
                  </Text>
                </View>
                <Text style={styles.cardTime}>{formatTimeLabel(item.created_at)}</Text>
              </View>
              {!isRead && (
                <View style={styles.unreadDot}>
                  <View style={styles.unreadPulse} />
                  <View style={styles.unreadCore} />
                </View>
              )}
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.cardSummary}>
                {item.summary || '暂无摘要'}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.cardStats}>
                {attachmentsCount > 0 && (
                  <View style={styles.cardStatItem}>
                    <Paperclip size={14} color={colors.stone400} weight="bold" />
                    <Text style={styles.cardStatText}>{attachmentsCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardArrow}>
                <ArrowUpRight size={16} color={colors.stone400} weight="bold" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      );
    },
    [openArticle, readIds]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.ambientBg}>
        <LinearGradient
          colors={[colors.surface, '#FFF8ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.orb, styles.orbGold]} />
        <View style={[styles.orb, styles.orbRed]} />
        <View style={[styles.orb, styles.orbWarm]} />
      </View>

      <View style={styles.topBarWrap}>
        <BlurView intensity={60} tint="light" style={styles.topBarBlur}>
          <View style={[styles.topBar, isScrolled && styles.topBarScrolled]}>
            <View>
              <View style={styles.dateRow}>
                <View style={styles.dateDot} />
                <Text style={styles.dateText}>{currentDate}</Text>
              </View>
              <Text style={styles.pageTitle}>{pageTitle}</Text>
            </View>
            <Pressable style={styles.bellButton} onPress={markAllRead}>
              <Bell size={18} color={colors.stone400} weight="fill" />
              {hasUnread && <View style={styles.bellDot} />}
            </Pressable>
          </View>
        </BlurView>
      </View>

      <Animated.View style={[styles.listWrap, { opacity: fadeIn }]}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.gold500} />
            <Text style={styles.loadingText}>正在加载今日要闻</Text>
          </View>
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
              <View style={styles.emptyState}>
                <Crown size={36} color={colors.gold400} weight="fill" />
                <Text style={styles.emptyTitle}>今日暂无新通知</Text>
                <Text style={styles.emptySub}>保持关注，稍后再来看看</Text>
              </View>
            }
          />
        )}
      </Animated.View>

      <BottomDock
        activeTab="home"
        onHome={() => undefined}
        onAi={() => router.push('/(tabs)/explore')}
        onSettings={() => undefined}
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
  ambientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orbGold: {
    width: 320,
    height: 320,
    backgroundColor: colors.gold100,
    top: -60,
    left: -60,
  },
  orbRed: {
    width: 300,
    height: 300,
    backgroundColor: '#F9D7D7',
    bottom: -60,
    right: -30,
  },
  orbWarm: {
    width: 220,
    height: 220,
    backgroundColor: '#FDEED6',
    top: '48%',
    left: '50%',
    marginLeft: -110,
    marginTop: -110,
  },
  topBarWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topBarBlur: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderRadius: 28,
  },
  topBarScrolled: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold400,
  },
  dateText: {
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.imperial600,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.stone900,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold100,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.imperial500,
    borderWidth: 1,
    borderColor: colors.white,
  },
  listWrap: {
    flex: 1,
    paddingTop: 110,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  cardPressable: {
    marginBottom: 20,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#b8860b',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(243, 224, 175, 0.7)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagHigh: {
    backgroundColor: colors.imperial50,
    borderColor: colors.imperial100,
  },
  tagNormal: {
    backgroundColor: colors.stone100,
    borderColor: colors.stone200,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tagTextHigh: {
    color: colors.imperial600,
  },
  tagTextNormal: {
    color: colors.stone600,
  },
  cardTime: {
    fontSize: 11,
    color: colors.stone400,
    fontWeight: '600',
  },
  unreadDot: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.imperial400,
    opacity: 0.4,
  },
  unreadCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.imperial600,
  },
  cardBody: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.stone900,
    marginBottom: 8,
  },
  cardSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.stone500,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.stone100,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 14,
  },
  cardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardStatText: {
    fontSize: 12,
    color: colors.stone400,
    fontWeight: '600',
  },
  cardArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    marginTop: 120,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.stone500,
  },
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

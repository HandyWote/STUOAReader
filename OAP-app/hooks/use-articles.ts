
import { useCallback, useMemo, useState } from 'react';

import type { Article, ArticleDetail } from '@/types/article';
import { fetchArticleDetail, fetchArticles } from '@/services/articles';
import {
  getCachedArticleDetail,
  getCachedArticlesByDate,
  getTodayDateString,
  setCachedArticleDetail,
  setCachedArticlesByDate,
} from '@/storage/article-storage';

type UseArticlesState = {
  articles: Article[];
  isLoading: boolean;
  isRefreshing: boolean;
  activeArticle: Article | null;
  activeDetail: ArticleDetail | null;
  sheetVisible: boolean;
  readIds: Record<number, boolean>;
};

export function useArticles(token?: string | null) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [activeDetail, setActiveDetail] = useState<ArticleDetail | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [readIds, setReadIds] = useState<Record<number, boolean>>({});

  const prefetchArticleDetails = useCallback(
    async (list: Article[]) => {
      for (const article of list) {
        if (!article?.id) {
          continue;
        }
        const cached = await getCachedArticleDetail(article.id);
        if (cached) {
          continue;
        }
        try {
          const detail = await fetchArticleDetail(article.id, token);
          await setCachedArticleDetail(detail);
        } catch {
        }
      }
    },
    [token]
  );

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateStr = getTodayDateString();
      const cached = await getCachedArticlesByDate(dateStr);
      // 先显示缓存（如果有），快速响应
      if (cached) {
        setArticles(cached);
      }
      // 无论是否有缓存，都请求服务器获取最新数据
      const list = await fetchArticles(token);
      setArticles(list);
      await setCachedArticlesByDate(dateStr, list);
      void prefetchArticleDetails(list);
    } catch {
      // 如果请求失败且有缓存，保持缓存显示
      const cached = await getCachedArticlesByDate(getTodayDateString());
      if (cached) {
        setArticles(cached);
      } else {
        setArticles([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [prefetchArticleDetails, token]);

  const refreshArticles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 强制从服务器获取，不使用缓存
      const list = await fetchArticles(token);
      setArticles(list);
      await setCachedArticlesByDate(getTodayDateString(), list);
      void prefetchArticleDetails(list);
    } catch {
      // 刷新失败时不改变现有数据
    } finally {
      setIsRefreshing(false);
    }
  }, [prefetchArticleDetails, token]);

  const openArticle = useCallback(
    async (article: Article) => {
      setActiveArticle(article);
      setSheetVisible(true);
      setReadIds((prev) => ({ ...prev, [article.id]: true }));
      const cachedDetail = await getCachedArticleDetail(article.id);
      if (cachedDetail) {
        setActiveDetail(cachedDetail);
        return;
      }
      setActiveDetail(null);
      try {
        const detail = await fetchArticleDetail(article.id, token);
        setActiveDetail(detail);
        await setCachedArticleDetail(detail);
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

  const state: UseArticlesState = {
    articles,
    isLoading,
    isRefreshing,
    activeArticle,
    activeDetail,
    sheetVisible,
    readIds,
  };

  return {
    ...state,
    loadArticles,
    refreshArticles,
    openArticle,
    closeArticle,
    markAllRead,
    hasUnread,
    setArticles,
    setReadIds,
  };
}

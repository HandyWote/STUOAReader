import { useCallback, useMemo, useState } from 'react';

import type { Article, ArticleDetail } from '@/types/article';
import { fetchArticleDetail, fetchArticles } from '@/services/articles';

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

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchArticles(token);
      setArticles(list);
    } catch {
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const refreshArticles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const list = await fetchArticles(token);
      setArticles(list);
    } catch {
      setArticles([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [token]);

  const openArticle = useCallback(
    async (article: Article) => {
      setActiveArticle(article);
      setSheetVisible(true);
      setReadIds((prev) => ({ ...prev, [article.id]: true }));
      setActiveDetail(null);
      try {
        const detail = await fetchArticleDetail(article.id, token);
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

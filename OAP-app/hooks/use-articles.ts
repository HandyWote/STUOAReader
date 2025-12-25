// 文章管理 Hook
// 主要功能：管理文章列表、文章详情、加载状态、缓存和阅读状态
// 支持文章列表加载、刷新、打开/关闭文章详情、标记已读等功能

import { useCallback, useMemo, useState } from 'react';

import type { Article, ArticleDetail } from '@/types/article';
import { fetchArticleDetail, fetchArticles } from '@/services/articles';
import {
  getCachedArticleDetail,
  getCachedArticlesByDate,
  getTodayDateString,
  pruneArticleCache,
  setCachedArticleDetail,
  setCachedArticlesByDate,
} from '@/storage/article-storage';

// 文章管理状态类型
type UseArticlesState = {
  articles: Article[]; // 文章列表
  isLoading: boolean; // 加载状态
  isRefreshing: boolean; // 刷新状态
  activeArticle: Article | null; // 当前激活的文章
  activeDetail: ArticleDetail | null; // 当前激活的文章详情
  sheetVisible: boolean; // 详情弹窗显示状态
  readIds: Record<number, boolean>; // 已读文章 ID 映射
};

// 文章管理 Hook
export function useArticles(token?: string | null) {
  // 文章列表状态
  const [articles, setArticles] = useState<Article[]>([]);
  // 初始加载状态
  const [isLoading, setIsLoading] = useState(true);
  // 下拉刷新状态
  const [isRefreshing, setIsRefreshing] = useState(false);
  // 当前激活的文章
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  // 当前激活的文章详情
  const [activeDetail, setActiveDetail] = useState<ArticleDetail | null>(null);
  // 详情弹窗显示状态
  const [sheetVisible, setSheetVisible] = useState(false);
  // 已读文章 ID 映射
  const [readIds, setReadIds] = useState<Record<number, boolean>>({});

  // 预取文章详情（后台加载以提高用户体验）
  const prefetchArticleDetails = useCallback(
    async (list: Article[]) => {
      for (const article of list) {
        // 跳过无效文章
        if (!article?.id) {
          continue;
        }
        // 检查是否已缓存
        const cached = await getCachedArticleDetail(article.id);
        if (cached) {
          continue;
        }
        try {
          // 获取文章详情并缓存
          const detail = await fetchArticleDetail(article.id, token);
          await setCachedArticleDetail(detail);
        } catch {
          // 忽略预取失败，不影响用户体验
        }
      }
    },
    [token]
  );

  // 加载文章列表
  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      // 清理过期缓存
      await pruneArticleCache();
      // 获取今日日期字符串
      const dateStr = getTodayDateString();
      // 检查是否有今日缓存
      const cached = await getCachedArticlesByDate(dateStr);
      if (cached) {
        // 使用缓存数据
        setArticles(cached);
        return;
      }
      // 从服务器获取文章列表
      const list = await fetchArticles(token);
      setArticles(list);
      // 缓存今日文章列表
      await setCachedArticlesByDate(dateStr, list);
      // 预取文章详情
      void prefetchArticleDetails(list);
    } catch {
      // 错误处理：清空文章列表
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [prefetchArticleDetails, token]);

  // 刷新文章列表
  const refreshArticles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 清理过期缓存
      await pruneArticleCache();
      // 获取今日日期字符串
      const dateStr = getTodayDateString();
      // 检查是否有今日缓存
      const cached = await getCachedArticlesByDate(dateStr);
      if (cached) {
        // 使用缓存数据
        setArticles(cached);
        return;
      }
      // 从服务器获取文章列表
      const list = await fetchArticles(token);
      setArticles(list);
      // 缓存今日文章列表
      await setCachedArticlesByDate(dateStr, list);
      // 预取文章详情
      void prefetchArticleDetails(list);
    } catch {
      // 错误处理：清空文章列表
      setArticles([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [prefetchArticleDetails, token]);

  // 打开文章详情
  const openArticle = useCallback(
    async (article: Article) => {
      // 设置当前激活的文章
      setActiveArticle(article);
      // 显示详情弹窗
      setSheetVisible(true);
      // 标记为已读
      setReadIds((prev) => ({ ...prev, [article.id]: true }));
      // 检查是否有缓存的详情
      const cachedDetail = await getCachedArticleDetail(article.id);
      if (cachedDetail) {
        // 使用缓存详情
        setActiveDetail(cachedDetail);
        return;
      }
      // 清空详情（准备加载）
      setActiveDetail(null);
      try {
        // 获取文章详情
        const detail = await fetchArticleDetail(article.id, token);
        setActiveDetail(detail);
        // 缓存文章详情
        await setCachedArticleDetail(detail);
      } catch {
        // 错误处理：清空详情
        setActiveDetail(null);
      }
    },
    [token]
  );

  // 关闭文章详情
  const closeArticle = useCallback(() => {
    setSheetVisible(false);
    setActiveArticle(null);
    setActiveDetail(null);
  }, []);

  // 标记所有文章为已读
  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next: Record<number, boolean> = { ...prev };
      // 遍历所有文章并标记为已读
      articles.forEach((article) => {
        next[article.id] = true;
      });
      return next;
    });
  }, [articles]);

  // 检查是否有未读文章
  const hasUnread = useMemo(
    () => articles.some((article) => !readIds[article.id]),
    [articles, readIds]
  );

  // 文章管理状态对象
  const state: UseArticlesState = {
    articles,
    isLoading,
    isRefreshing,
    activeArticle,
    activeDetail,
    sheetVisible,
    readIds,
  };

  // 返回状态和操作方法
  return {
    ...state,
    loadArticles, // 加载文章列表
    refreshArticles, // 刷新文章列表
    openArticle, // 打开文章详情
    closeArticle, // 关闭文章详情
    markAllRead, // 标记所有为已读
    hasUnread, // 是否有未读文章
    setArticles, // 设置文章列表
    setReadIds, // 设置已读状态
  };
}

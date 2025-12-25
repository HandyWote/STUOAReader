import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Article, ArticleDetail } from '@/types/article';

const DAY_KEY_PREFIX = 'articles.day.';
const DETAIL_KEY_PREFIX = 'articles.detail.';
type CachedDay = {
  date: string;
  cached_at: number;
  articles: Article[];
};

type CachedDetail = {
  cached_at: number;
  published_on?: string;
  detail: ArticleDetail;
};

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function dayKey(dateStr: string) {
  return `${DAY_KEY_PREFIX}${dateStr}`;
}

function detailKey(id: number) {
  return `${DETAIL_KEY_PREFIX}${id}`;
}

export async function pruneArticleCache() {
  const keys = await AsyncStorage.getAllKeys();
  const dayKeys = keys.filter((key) => key.startsWith(DAY_KEY_PREFIX));
  const detailKeys = keys.filter((key) => key.startsWith(DETAIL_KEY_PREFIX));

  const toRemove: string[] = [];

  dayKeys.forEach((key) => {
    const dateStr = key.slice(DAY_KEY_PREFIX.length);
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      toRemove.push(key);
    }
  });

  if (detailKeys.length > 0) {
    const pairs = await AsyncStorage.multiGet(detailKeys);
    pairs.forEach(([key, raw]) => {
      if (!raw) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as CachedDetail;
        const cachedAt = new Date(parsed.cached_at);
        if (Number.isNaN(cachedAt.getTime())) {
          toRemove.push(key);
        }
      } catch {
        toRemove.push(key);
      }
    });
  }

  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}

export async function getCachedArticlesByDate(dateStr: string) {
  const key = dayKey(dateStr);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CachedDay;
    return parsed.articles;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function setCachedArticlesByDate(dateStr: string, articles: Article[]) {
  const payload: CachedDay = {
    date: dateStr,
    cached_at: Date.now(),
    articles,
  };
  await AsyncStorage.setItem(dayKey(dateStr), JSON.stringify(payload));
}

export async function getCachedArticleDetail(id: number) {
  const key = detailKey(id);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CachedDetail;
    return parsed.detail;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function setCachedArticleDetail(detail: ArticleDetail) {
  if (!detail?.id) {
    return;
  }
  const payload: CachedDetail = {
    cached_at: Date.now(),
    published_on: detail.published_on,
    detail,
  };
  await AsyncStorage.setItem(detailKey(detail.id), JSON.stringify(payload));
}

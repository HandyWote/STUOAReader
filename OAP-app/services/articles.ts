import type { Article, ArticleDetail, RelatedArticle } from '@/types/article';
import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';

export async function fetchArticles(token?: string | null) {
  const resp = await fetch(`${getApiBaseUrl()}/articles/`, {
    headers: buildAuthHeaders(token),
  });
  if (!resp.ok) {
    throw new Error('articles fetch failed');
  }
  const data = await resp.json();
  const list = Array.isArray(data?.articles) ? data.articles : [];
  return list as Article[];
}

export async function fetchArticleDetail(id: number, token?: string | null) {
  const resp = await fetch(`${getApiBaseUrl()}/articles/${id}`, {
    headers: buildAuthHeaders(token),
  });
  if (!resp.ok) {
    throw new Error('article detail fetch failed');
  }
  return (await resp.json()) as ArticleDetail;
}

export function buildArticleFromRelated(article: RelatedArticle): Article {
  return {
    id: article.id,
    title: article.title,
    unit: article.unit,
    published_on: article.published_on,
    summary: article.summary_snippet,
  };
}

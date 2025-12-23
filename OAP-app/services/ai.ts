import type { RelatedArticle } from '@/types/article';
import { getApiBaseUrl } from '@/services/api';

export async function askAi(question: string, token: string) {
  const resp = await fetch(`${getApiBaseUrl()}/ai/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, top_k: 3 }),
  });
  if (!resp.ok) {
    throw new Error('ai ask failed');
  }
  return (await resp.json()) as {
    answer?: string;
    related_articles?: RelatedArticle[];
  };
}

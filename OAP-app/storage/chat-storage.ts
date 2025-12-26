import type { ChatMessage } from '@/types/chat';
import { getItem, removeItem, setItem } from '@/storage/universal-storage';

const CHAT_HISTORY_KEY = 'ai_chat_history.v1';
type CachedChat = {
  cached_at: number;
  messages: ChatMessage[];
};

export async function getChatHistory() {
  const raw = await getItem(CHAT_HISTORY_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CachedChat;
    if (!Array.isArray(parsed.messages)) {
      return null;
    }
    return parsed.messages;
  } catch {
    await removeItem(CHAT_HISTORY_KEY);
    return null;
  }
}

export async function setChatHistory(messages: ChatMessage[]) {
  const payload: CachedChat = {
    cached_at: Date.now(),
    messages,
  };
  await setItem(CHAT_HISTORY_KEY, JSON.stringify(payload));
}

export async function clearChatHistory() {
  await removeItem(CHAT_HISTORY_KEY);
}

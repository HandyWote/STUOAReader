import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatMessage } from '@/types/chat';

const CHAT_HISTORY_KEY = 'ai_chat_history.v1';
const isWeb = typeof window !== 'undefined';

type CachedChat = {
  cached_at: number;
  messages: ChatMessage[];
};

async function getItem(key: string) {
  try {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Failed to read chat storage:', error);
  }
  return null;
}

async function setItem(key: string, value: string) {
  try {
    if (isWeb) {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error('Failed to write chat storage:', error);
  }
}

async function removeItem(key: string) {
  try {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove chat storage:', error);
  }
}

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

// 统一管理登录状态（Token）的全局状态工具
// 主要功能：管理用户认证令牌的存储、读取和状态同步

import { useEffect, useSyncExternalStore } from 'react';

import { getAccessToken, setAccessToken } from '@/storage/auth-storage';

// 认证状态类型
type AuthState = {
  token: string | null; // 认证令牌
  isLoading: boolean; // 加载状态
};

// 状态监听器集合
const listeners = new Set<() => void>();
// 全局认证状态
let authState: AuthState = { token: null, isLoading: true };

// 通知所有监听者更新状态
function notify() {
  listeners.forEach((listener) => listener());
}

// 订阅 Token 状态变化（供 useSyncExternalStore 使用）
export function subscribeAuthToken(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// 获取 Token 状态快照（供 useSyncExternalStore 使用）
export function getAuthSnapshot() {
  return authState;
}

// 适配双端：刷新 Token（从对应存储中读取）
export async function refreshAuthToken() {
  let token: string | null = null;

  try {
    // 从统一存储读取
    token = await getAccessToken();
  } catch (error) {
    console.error('Failed to read token from storage:', error);
    token = null;
  }

  // 更新内存状态并通知监听者
  authState = { token, isLoading: false };
  notify();
}

// 适配双端：设置 Token（同步持久化存储）
export async function setAuthToken(token: string | null) {
  try {
    await setAccessToken(token);
  } catch (error) {
    console.error('Failed to save token to storage:', error);
    // 即使存储失败，仍然更新内存状态
  }

  // 更新内存状态并通知监听者
  authState = { token, isLoading: false };
  notify();
}

// 简化调用：清空 Token（复用 setAuthToken）
export async function clearAuthToken() {
  await setAuthToken(null);
}

// 双端共用：获取 Token 状态钩子
export function useAuthTokenState() {
  // 使用 useSyncExternalStore 实现状态同步
  const state = useSyncExternalStore(subscribeAuthToken, getAuthSnapshot, getAuthSnapshot);

  useEffect(() => {
    // 初始化时刷新 Token（从对应存储读取）
    if (state.isLoading) {
      void refreshAuthToken();
    }
  }, [state.isLoading]);

  // 返回状态和操作方法
  return {
    ...state,
    setAuthToken, // 暴露设置 Token 方法
    clearAuthToken, // 暴露清空 Token 方法
    refreshAuthToken, // 暴露手动刷新 Token 方法
  };
}

// 双端共用：简化获取 Token 钩子
export function useAuthToken() {
  const { token } = useAuthTokenState();
  return token;
}

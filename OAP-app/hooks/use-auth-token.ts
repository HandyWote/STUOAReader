//该文件为“统一管理登录状态（Token）的全局状态工具”

import { useEffect, useSyncExternalStore } from 'react';

// 🌟 核心：区分环境，按需导入存储模块
let SecureStore: typeof import('expo-secure-store') | null = null;
// 判断是否为 App 端（非浏览器环境）
const isAppEnv = typeof window === 'undefined';
if (isAppEnv) {
  // App 端：导入 expo-secure-store
  SecureStore = require('expo-secure-store');
}

type AuthState = {
  token: string | null;
  isLoading: boolean;
};

const listeners = new Set<() => void>();
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

// 🌟 适配双端：刷新 Token（从对应存储中读取）
export async function refreshAuthToken() {
  let token: string | null = null;
  
  if (isAppEnv && SecureStore) {
    // App 端：从 SecureStore 读取
    token = await SecureStore.getItemAsync('access_token');
  } else if (typeof window !== 'undefined') {
    // 网页端：从 localStorage 读取
    token = localStorage.getItem('access_token');
  }

  authState = { token, isLoading: false };
  notify();
}

// 🌟 适配双端：设置 Token（同步持久化存储）
export async function setAuthToken(token: string | null) {
  if (isAppEnv && SecureStore) {
    // App 端：操作 SecureStore
    if (token) {
      await SecureStore.setItemAsync('access_token', token);
    } else {
      await SecureStore.deleteItemAsync('access_token');
    }
  } else if (typeof window !== 'undefined') {
    // 网页端：操作 localStorage
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  // 更新内存状态并通知监听者
  authState = { token, isLoading: false };
  notify();
}

// 🌟 简化调用：清空 Token（复用 setAuthToken）
export async function clearAuthToken() {
  await setAuthToken(null);
}

// 🌟 双端共用：获取 Token 状态钩子
export function useAuthTokenState() {
  const state = useSyncExternalStore(subscribeAuthToken, getAuthSnapshot, getAuthSnapshot);

  useEffect(() => {
    // 初始化时刷新 Token（从对应存储读取）
    if (state.isLoading) {
      void refreshAuthToken();
    }
  }, [state.isLoading]);

  return {
    ...state,
    setAuthToken,    // 暴露设置 Token 方法
    clearAuthToken,  // 暴露清空 Token 方法
    refreshAuthToken // 暴露手动刷新 Token 方法
  };
}

// 🌟 双端共用：简化获取 Token 钩子
export function useAuthToken() {
  const { token } = useAuthTokenState();
  return token;
}
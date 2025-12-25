// 认证存储工具：双端适配（App 用 SecureStore，Web 用 localStorage）

type SecureStoreModule = typeof import('expo-secure-store');

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_PROFILE_KEY = 'user_profile';

const isAppEnv = typeof window === 'undefined';
let SecureStore: SecureStoreModule | null = null;

if (isAppEnv) {
  SecureStore = require('expo-secure-store');
}

async function getItem(key: string) {
  try {
    if (isAppEnv && SecureStore) {
      return await SecureStore.getItemAsync(key);
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (error) {
    console.error('Failed to read auth storage:', error);
  }
  return null;
}

async function setItem(key: string, value: string) {
  try {
    if (isAppEnv && SecureStore) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.error('Failed to write auth storage:', error);
  }
}

async function removeItem(key: string) {
  try {
    if (isAppEnv && SecureStore) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to remove auth storage:', error);
  }
}

export async function getAccessToken() {
  return await getItem(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string | null) {
  if (token) {
    await setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  await removeItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return await getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string | null) {
  if (token) {
    await setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  await removeItem(REFRESH_TOKEN_KEY);
}

export async function getUserProfileRaw() {
  return await getItem(USER_PROFILE_KEY);
}

export async function setUserProfileRaw(value: string | null) {
  if (value) {
    await setItem(USER_PROFILE_KEY, value);
    return;
  }
  await removeItem(USER_PROFILE_KEY);
}

export async function clearAuthStorage() {
  await Promise.all([
    removeItem(ACCESS_TOKEN_KEY),
    removeItem(REFRESH_TOKEN_KEY),
    removeItem(USER_PROFILE_KEY),
  ]);
}

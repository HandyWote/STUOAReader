import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

function safeLocalStorage() {
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export async function getItem(key: string) {
  try {
    if (isWeb) {
      return safeLocalStorage()?.getItem(key) ?? null;
    }
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Failed to read storage:', error);
    return null;
  }
}

export async function setItem(key: string, value: string) {
  try {
    if (isWeb) {
      safeLocalStorage()?.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error('Failed to write storage:', error);
  }
}

export async function removeItem(key: string) {
  try {
    if (isWeb) {
      safeLocalStorage()?.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove storage:', error);
  }
}

export async function getAllKeys() {
  try {
    if (isWeb) {
      const storage = safeLocalStorage();
      if (!storage) {
        return [];
      }
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    }
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('Failed to read storage keys:', error);
    return [];
  }
}

export async function multiGet(keys: string[]) {
  try {
    if (isWeb) {
      const storage = safeLocalStorage();
      if (!storage) {
        return keys.map((key) => [key, null] as [string, string | null]);
      }
      return keys.map((key) => [key, storage.getItem(key)]);
    }
    return await AsyncStorage.multiGet(keys);
  } catch (error) {
    console.error('Failed to read storage batch:', error);
    return keys.map((key) => [key, null] as [string, string | null]);
  }
}

export async function multiRemove(keys: string[]) {
  try {
    if (isWeb) {
      const storage = safeLocalStorage();
      keys.forEach((key) => storage?.removeItem(key));
      return;
    }
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Failed to remove storage batch:', error);
  }
}

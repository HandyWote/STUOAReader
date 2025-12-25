import { useEffect, useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

type AuthState = {
  token: string | null;
  isLoading: boolean;
};

const listeners = new Set<() => void>();
let authState: AuthState = { token: null, isLoading: true };

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeAuthToken(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthSnapshot() {
  return authState;
}

export async function refreshAuthToken() {
  const token = await SecureStore.getItemAsync('access_token');
  authState = { token, isLoading: false };
  notify();
}

export function setAuthToken(token: string | null) {
  authState = { token, isLoading: false };
  notify();
}

export function useAuthTokenState() {
  const state = useSyncExternalStore(subscribeAuthToken, getAuthSnapshot, getAuthSnapshot);

  useEffect(() => {
    if (state.isLoading) {
      void refreshAuthToken();
    }
  }, [state.isLoading]);

  return state;
}

export function useAuthToken() {
  const { token } = useAuthTokenState();
  return token;
}

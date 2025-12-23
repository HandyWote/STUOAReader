import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync('access_token').then((value) => {
      if (mounted) {
        setToken(value);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return token;
}

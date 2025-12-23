import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export function useDisplayName(defaultName = '用户') {
  const [displayName, setDisplayName] = useState<string>(defaultName);

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync('user_profile').then((value) => {
      if (!mounted) {
        return;
      }
      try {
        const parsed = value ? JSON.parse(value) : {};
        setDisplayName(parsed?.display_name || parsed?.username || defaultName);
      } catch {
        setDisplayName(defaultName);
      }
    });
    return () => {
      mounted = false;
    };
  }, [defaultName]);

  return displayName;
}


import { useEffect, useState } from 'react';
import { getUserProfileRaw } from '@/storage/auth-storage';

export function useDisplayName(defaultName = '用户') {
  const [displayName, setDisplayName] = useState<string>(defaultName);

  useEffect(() => {
    let mounted = true;
    getUserProfileRaw().then((value) => {
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

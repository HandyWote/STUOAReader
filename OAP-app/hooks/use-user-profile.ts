
import { useEffect, useState } from 'react';
import { getUserProfileRaw } from '@/storage/auth-storage';

type UserProfile = {
  display_name?: string;
  username?: string;
  is_vip?: boolean;
  vip_expired_at?: string;
};

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    getUserProfileRaw().then((value) => {
      if (!mounted) {
        return;
      }
      try {
        const parsed = value ? (JSON.parse(value) as UserProfile) : null;
        setProfile(parsed);
      } catch {
        setProfile(null);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return profile;
}

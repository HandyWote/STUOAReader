// 用户资料 Hook
// 主要功能：从 SecureStore 读取用户资料信息
// 包含显示名称、用户名、VIP 状态和 VIP 过期时间

import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

// 用户资料类型
type UserProfile = {
  display_name?: string; // 显示名称
  username?: string; // 用户名
  is_vip?: boolean; // 是否为 VIP 用户
  vip_expired_at?: string; // VIP 过期时间
};

// 用户资料 Hook
export function useUserProfile() {
  // 用户资料状态
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // 组件挂载标记，防止卸载后更新状态
    let mounted = true;
    // 从 SecureStore 读取用户资料
    SecureStore.getItemAsync('user_profile').then((value) => {
      // 如果组件已卸载，不更新状态
      if (!mounted) {
        return;
      }
      try {
        // 解析用户资料 JSON
        const parsed = value ? (JSON.parse(value) as UserProfile) : null;
        setProfile(parsed);
      } catch {
        // 解析失败时设置为 null
        setProfile(null);
      }
    });
    // 清理函数：标记组件已卸载
    return () => {
      mounted = false;
    };
  }, []);

  return profile;
}

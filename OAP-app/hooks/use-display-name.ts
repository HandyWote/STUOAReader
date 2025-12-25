// 用户显示名称 Hook
// 主要功能：从 SecureStore 读取用户资料并获取显示名称
// 支持自定义默认名称，优先使用 display_name，其次使用 username

import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

// 用户显示名称 Hook
export function useDisplayName(defaultName = '用户') {
  // 显示名称状态
  const [displayName, setDisplayName] = useState<string>(defaultName);

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
        const parsed = value ? JSON.parse(value) : {};
        // 优先使用 display_name，其次使用 username，最后使用默认名称
        setDisplayName(parsed?.display_name || parsed?.username || defaultName);
      } catch {
        // 解析失败时使用默认名称
        setDisplayName(defaultName);
      }
    });
    // 清理函数：标记组件已卸载
    return () => {
      mounted = false;
    };
  }, [defaultName]);

  return displayName;
}

// 颜色主题 Hook（Web 端）
// 主要功能：获取当前设备的颜色主题（亮色/暗色模式）
// 支持静态渲染，在客户端重新计算颜色主题

import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// 颜色主题 Hook
export function useColorScheme() {
  // 水合状态：true 表示已在客户端渲染
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // 客户端渲染完成后标记为已水合
    setHasHydrated(true);
  }, []);

  // 获取 React Native 的颜色主题
  const colorScheme = useRNColorScheme();

  // 如果已水合，返回实际颜色主题；否则返回默认亮色主题
  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}

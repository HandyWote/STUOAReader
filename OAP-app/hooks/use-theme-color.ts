// 主题颜色获取 Hook
// 主要功能：根据当前颜色主题（亮色/暗色）获取对应的颜色值
// 支持自定义颜色值，优先使用传入的颜色，否则使用主题默认颜色

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 主题颜色获取 Hook
export function useThemeColor(
  props: { light?: string; dark?: string }, // 自定义颜色对象（亮色/暗色）
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark // 颜色名称（从主题配置中获取）
) {
  // 获取当前颜色主题
  const theme = useColorScheme() ?? 'light';
  // 获取当前主题的自定义颜色
  const colorFromProps = props[theme];

  // 优先使用自定义颜色，否则使用主题默认颜色
  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

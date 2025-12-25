// 主题化视图组件
// 主要功能：根据当前主题（亮色/暗色）自动适配背景色的视图容器
import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

// 主题化视图组件的属性类型
// 继承 React Native View 的所有属性，并扩展主题颜色配置
export type ThemedViewProps = ViewProps & {
  lightColor?: string; // 亮色主题下的背景色
  darkColor?: string; // 暗色主题下的背景色
};

// 主题化视图组件
// 根据当前主题自动选择对应的背景色，支持自定义亮色/暗色主题颜色
export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // 根据当前主题获取背景色（优先使用自定义颜色，否则使用默认主题背景色）
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // 返回带有主题背景色的视图组件
  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}

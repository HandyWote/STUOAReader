// 主题文本组件
// 主要功能：根据当前主题自动切换文本颜色，提供多种预定义的文本样式类型
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

// 主题文本属性类型：继承Text组件属性，添加亮色/暗色主题颜色和文本类型
export type ThemedTextProps = TextProps & {
  lightColor?: string; // 亮色主题下的文本颜色
  darkColor?: string; // 暗色主题下的文本颜色
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link'; // 文本类型
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  // 根据主题获取文本颜色
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // 默认文本样式
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  // 半粗体文本样式
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  // 标题样式
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  // 副标题样式
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  // 链接样式
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});

// 可折叠组件
// 主要功能：提供可展开/收起的内容容器，点击标题可切换显示状态
import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 可折叠组件
// 属性：children - 子内容，title - 标题文本
export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  // 展开状态：true 表示展开，false 表示收起
  const [isOpen, setIsOpen] = useState(false);
  // 获取当前主题（亮色/暗色）
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView>
      {/* 标题行：点击可切换展开/收起状态 */}
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}>
        {/* 箭头图标：根据展开状态旋转 */}
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        {/* 标题文本 */}
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {/* 内容区域：仅在展开状态下显示 */}
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

// 样式定义
const styles = StyleSheet.create({
  // 标题行样式
  heading: {
    flexDirection: 'row', // 水平排列
    alignItems: 'center', // 垂直居中
    gap: 6, // 子元素间距
  },
  // 内容区域样式
  content: {
    marginTop: 6, // 顶部外边距
    marginLeft: 24, // 左侧外边距（缩进显示）
  },
});

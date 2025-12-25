// 视差滚动视图组件
// 主要功能：实现带有视差滚动效果的头部，头部图像会随滚动产生平移和缩放动画
import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

// 头部高度常量
const HEADER_HEIGHT = 250;

// 视差滚动视图属性类型
type Props = PropsWithChildren<{
  headerImage: ReactElement; // 头部图像元素
  headerBackgroundColor: { dark: string; light: string }; // 头部背景颜色（亮色/暗色主题）
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  // 获取当前主题背景色
  const backgroundColor = useThemeColor({}, 'background');
  // 获取当前颜色方案（亮色/暗色）
  const colorScheme = useColorScheme() ?? 'light';
  // 创建滚动视图的动画引用
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // 获取滚动偏移量
  const scrollOffset = useScrollOffset(scrollRef);
  // 头部动画样式：根据滚动偏移量计算平移和缩放
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          // Y轴平移：滚动时头部以不同速度移动，产生视差效果
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          // 缩放：向上滚动时头部放大，向下滚动时头部缩小
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor, flex: 1 }}
      // 限制滚动事件触发频率为每秒60次（16ms）
      scrollEventThrottle={16}>
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[colorScheme] },
          headerAnimatedStyle,
        ]}>
        {headerImage}
      </Animated.View>
      <ThemedView style={styles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 头部视图样式：固定高度，超出部分隐藏
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  // 内容区域样式：内边距32，子元素间距16
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});

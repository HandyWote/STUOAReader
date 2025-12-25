// 模态框屏幕组件
// 主要功能：展示一个简单的模态框界面，包含标题和返回首页的链接
import { Link } from 'expo-router'; // 路由链接组件，用于页面导航
import { StyleSheet } from 'react-native'; // 样式表组件

import { ThemedText } from '@/components/themed-text'; // 主题化文本组件
import { ThemedView } from '@/components/themed-view'; // 主题化视图组件

// 模态框屏幕组件定义
export default function ModalScreen() {
  return (
    // 主题化容器视图，应用整体样式
    <ThemedView style={styles.container}>
      // 主题化标题文本，显示模态框标题
      <ThemedText type="title">This is a modal</ThemedText>
      // 路由链接，点击后返回首页并关闭模态框
      <Link href="/" dismissTo style={styles.link}>
        // 主题化链接文本
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

// 样式定义
const styles = StyleSheet.create({
  // 容器样式：占满整个屏幕，内容居中对齐
  container: {
    flex: 1, // 占满可用空间
    alignItems: 'center', // 水平居中
    justifyContent: 'center', // 垂直居中
    padding: 20, // 内边距
  },
  // 链接样式：顶部外边距和垂直内边距
  link: {
    marginTop: 15, // 顶部外边距
    paddingVertical: 15, // 垂直内边距
  },
});

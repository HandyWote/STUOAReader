// 根布局文件
// 主要功能：配置应用的全局布局、主题、路由守卫和通知任务
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'; // 导航主题配置
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router'; // 路由导航
import { StatusBar } from 'expo-status-bar'; // 状态栏
import 'react-native-reanimated'; // 动画库

import { useAuthTokenState } from '@/hooks/use-auth-token'; // 认证令牌状态
import { useColorScheme } from '@/hooks/use-color-scheme'; // 颜色方案
import { registerNotificationTaskIfEnabled } from '@/notifications/notification-task'; // 通知任务注册

// 根布局组件
export default function RootLayout() {
  const colorScheme = useColorScheme(); // 获取当前颜色方案（亮色/暗色）
  const router = useRouter(); // 路由实例，用于页面跳转
  const segments = useSegments(); // 当前路由分段信息
  const { token, isLoading } = useAuthTokenState(); // 获取认证令牌和加载状态

  // 初始化通知任务（仅在通知启用时注册，仅执行一次）
  useEffect(() => {
    registerNotificationTaskIfEnabled();
  }, []);

  // 核心路由守卫逻辑（权限拦截+自动跳转）
  useEffect(() => {
    if (isLoading) return; // 加载中时跳过守卫逻辑

    const first = segments[0]; // 获取第一个路由分段
    const inLogin = first === 'login'; // 判断是否在登录页
    const inTabs = first === '(tabs)'; // 判断是否在标签页

    // 未登录且不在登录页 → 强制跳转到登录页
    if (!token && !inLogin) {
      router.replace('/login');
      return;
    }

    // 已登录且在登录页 → 强制跳转到首页
    if (token && inLogin) {
      router.replace('/(tabs)');
    }
  }, [isLoading, router, segments, token]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="login">
        {/* 登录页：隐藏导航栏 */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        {/* 标签页布局：包含首页、探索页、设置页 */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* 模态框页：以弹窗形式展示，保留导航栏 */}
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal', // 模态框展示方式
            title: 'Modal',
            headerShown: true // 弹窗页保留导航栏，提升用户体验
          }} 
        />
      </Stack>
      {/* 状态栏：自动适配主题 */}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
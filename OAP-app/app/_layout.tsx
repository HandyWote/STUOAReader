import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useAuthTokenState } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerNotificationTaskIfEnabled } from '@/notifications/notification-task';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { token, isLoading } = useAuthTokenState();

  // 初始化通知任务（仅执行一次）
  useEffect(() => {
    registerNotificationTaskIfEnabled();
  }, []);

  // 核心路由守卫逻辑（权限拦截+自动跳转）
  useEffect(() => {
    if (isLoading) return;

    const first = segments[0];
    const inLogin = first === 'login';

    // 未登录且不在登录页 → 强制跳登录页
    if (!token && !inLogin) {
      router.replace('/login');
      return;
    }

    // 已登录且在登录页 → 强制跳首页
    if (token && inLogin) {
      router.replace('/(tabs)');
    }
  }, [isLoading, router, segments, token]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal', 
            title: 'Modal',
            headerShown: true // 弹窗页保留导航栏，提升用户体验
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
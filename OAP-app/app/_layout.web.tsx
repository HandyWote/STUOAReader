// 网页端根布局文件
// 主要功能：配置网页端的全局布局、主题、路由守卫
// 特别处理网页端的 localStorage 异步加载和路由守卫逻辑

import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useAuthTokenState } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { refreshSessionOnForeground } from '@/services/auth';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { token, isLoading } = useAuthTokenState();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshSessionOnForeground();
      }
    };

    refreshIfVisible();

    const handleVisibility = () => {
      refreshIfVisible();
    };

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    const first = segments[0];
    const inLogin = first === 'login';
    const inTabs = first === '(tabs)';

    if (!token && !inLogin) {
      router.replace('/login');
      return;
    }

    if (token && inLogin) {
      router.replace('/(tabs)');
    }
  }, [isMounted, isLoading, router, segments, token]);

  if (!isMounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

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
            headerShown: true
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

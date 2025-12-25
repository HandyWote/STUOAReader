// 标签页导航布局
// 主要功能：定义应用的底部标签页导航结构，包含首页、探索和设置三个标签页
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 标签页布局组件
export default function TabLayout() {
  const colorScheme = useColorScheme(); // 获取当前颜色方案（亮色/暗色）

  return (
    // 标签页导航组件
    <Tabs
      // 标签页屏幕选项配置
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint, // 激活标签颜色
        headerShown: false, // 隐藏默认头部
        tabBarButton: HapticTab, // 使用自定义的触觉反馈标签按钮
        tabBarStyle: { display: 'none' }, // 隐藏默认标签栏（使用自定义BottomDock）
      }}>
      {/* 首页标签页 */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      {/* 探索标签页 */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      {/* 设置标签页 */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

// 底部导航栏组件
// 主要功能：提供首页、AI助理和设置三个标签的导航，使用模糊背景和圆角设计
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gear, House, Sparkle } from 'phosphor-react-native';

import { colors } from '@/constants/palette';

// 底部标签类型
type DockTab = 'home' | 'ai' | 'settings';

// 底部导航栏属性类型
type BottomDockProps = {
  activeTab: DockTab; // 当前激活的标签
  onHome: () => void; // 首页标签点击回调
  onAi: () => void; // AI助理标签点击回调
  onSettings: () => void; // 设置标签点击回调
};

// 底部导航栏组件
export function BottomDock({ activeTab, onHome, onAi, onSettings }: BottomDockProps) {
  // 根据当前激活标签获取对应的激活样式
  const activeStyle =
    activeTab === 'home'
      ? styles.dockButtonHome
      : activeTab === 'ai'
        ? styles.dockButtonAi
        : styles.dockButtonSettings;

  return (
    <View style={styles.dockWrap}>
      {/* 模糊背景容器 */}
      <BlurView intensity={60} tint="light" style={styles.dock}>
        {/* 首页标签按钮 */}
        <Pressable
          style={[styles.dockButton, activeTab === 'home' && activeStyle]}
          onPress={onHome}
        >
          <House
            size={22}
            color={activeTab === 'home' ? colors.imperial600 : colors.stone400}
            weight={activeTab === 'home' ? 'fill' : 'bold'}
          />
        </Pressable>
        {/* AI助理标签按钮 */}
        <Pressable
          style={[styles.dockButton, activeTab === 'ai' && activeStyle]}
          onPress={onAi}
        >
          <Sparkle
            size={22}
            color={activeTab === 'ai' ? colors.gold500 : colors.stone400}
            weight={activeTab === 'ai' ? 'fill' : 'bold'}
          />
        </Pressable>
        {/* 设置标签按钮 */}
        <Pressable
          style={[styles.dockButton, activeTab === 'settings' && activeStyle]}
          onPress={onSettings}
        >
          <Gear
            size={22}
            color={activeTab === 'settings' ? colors.stone800 : colors.stone400}
            weight={activeTab === 'settings' ? 'fill' : 'bold'}
          />
        </Pressable>
      </BlurView>
    </View>
  );
}

// 样式定义
const styles = StyleSheet.create({
  // 底部导航栏外层容器样式：绝对定位在底部
  dockWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    // 新增：给外层容器加左右边距，让圆角不贴屏幕边缘（更明显）
    paddingHorizontal: 20, 
  },
  // 模糊背景容器样式
  dock: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    // 1. 调整圆角大小（999是全圆角，可改小如32/40；想更圆润保留999即可）
    borderRadius: 999, 
    flexDirection: 'row',
    gap: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    // 2. 新增：避免内容溢出圆角（BlurView可能导致边缘漏出）
    overflow: 'hidden', 
    // 3. 可选：加轻微内阴影，强化圆角质感
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  // 导航按钮样式
  dockButton: {
    width: 44,
    height: 44,
    borderRadius: 16, // 单个按钮的圆角（保持不变即可）
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 首页按钮激活样式：紫色背景
  dockButtonHome: {
    backgroundColor: colors.imperial50,
    ...Platform.select({
      ios: {
        shadowColor: colors.imperial500,
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 0px 12px rgba(192, 36, 37, 0.18)',
      },
    }),
  },
  // AI助理按钮激活样式：金色背景
  dockButtonAi: {
    backgroundColor: colors.gold50,
    ...Platform.select({
      ios: {
        shadowColor: colors.gold500,
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 0px 12px rgba(184, 134, 11, 0.15)',
      },
    }),
  },
  // 设置按钮激活样式：灰色背景
  dockButtonSettings: {
    backgroundColor: colors.stone100,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone500,
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 0px 10px rgba(107, 100, 97, 0.12)',
      },
    }),
  },
});

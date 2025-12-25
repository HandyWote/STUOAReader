// 环境背景组件
// 主要功能：根据不同的页面变体显示不同的背景效果，使用渐变色和圆形光晕装饰
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/constants/palette';

// 背景变体类型：首页、探索页、登录页
type AmbientVariant = 'home' | 'explore' | 'login';

// 背景组件属性类型
type AmbientBackgroundProps = {
  variant: AmbientVariant; // 背景变体
};

// 环境背景组件函数
export function AmbientBackground({ variant }: AmbientBackgroundProps) {
  // 首页背景变体：包含渐变背景和三个圆形光晕
  if (variant === 'home') {
    return (
      <View style={styles.ambientBg}>
        {/* 渐变背景层 */}
        <LinearGradient
          colors={[colors.surface, colors.surfaceWarm]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* 三个装饰性圆形光晕 */}
        <View style={[styles.orb, styles.orbGold]} />
        <View style={[styles.orb, styles.orbRed]} />
        <View style={[styles.orb, styles.orbWarmHome]} />
      </View>
    );
  }

  // 探索页背景变体：包含三个圆形光晕，无渐变背景
  if (variant === 'explore') {
    return (
      <View style={styles.ambientBg}>
        <View style={[styles.orb, styles.orbGold]} />
        <View style={[styles.orb, styles.orbRed]} />
        <View style={[styles.orb, styles.orbWarmExplore]} />
      </View>
    );
  }

  // 登录页背景变体：包含背景色和三个圆形光晕，禁用指针事件
  return (
    <View pointerEvents="none" style={styles.ambientBgLogin}>
      <View style={[styles.orb, styles.orbGoldLogin]} />
      <View style={[styles.orb, styles.orbRedLogin]} />
      <View style={[styles.orb, styles.orbWarmLogin]} />
    </View>
  );
}

// 样式定义
const styles = StyleSheet.create({
  // 背景容器样式：绝对定位，占满整个父容器
  ambientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  // 登录页背景容器样式
  ambientBgLogin: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
  },
  // 圆形光晕基础样式
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  // 金色光晕样式（首页和探索页）
  orbGold: {
    width: 320,
    height: 320,
    backgroundColor: colors.gold100,
    top: -60,
    left: -60,
  },
  // 红色光晕样式（首页和探索页）
  orbRed: {
    width: 300,
    height: 300,
    backgroundColor: colors.rose100,
    bottom: -60,
    right: -30,
  },
  // 暖色光晕样式（首页）
  orbWarmHome: {
    width: 220,
    height: 220,
    backgroundColor: colors.warm100,
    top: '48%',
    left: '50%',
    marginLeft: -110,
    marginTop: -110,
  },
  // 暖色光晕样式（探索页）
  orbWarmExplore: {
    width: 220,
    height: 220,
    backgroundColor: colors.warm100,
    top: '45%',
    left: '50%',
    marginLeft: -110,
    marginTop: -110,
  },
  // 金色光晕样式（登录页）
  orbGoldLogin: {
    width: 320,
    height: 320,
    backgroundColor: colors.gold100,
    top: -60,
    left: -60,
  },
  // 红色光晕样式（登录页）
  orbRedLogin: {
    width: 320,
    height: 320,
    backgroundColor: colors.rose100,
    bottom: -40,
    right: -40,
  },
  // 暖色光晕样式（登录页）
  orbWarmLogin: {
    width: 220,
    height: 220,
    backgroundColor: colors.warm100,
    top: '48%',
    left: '50%',
    marginLeft: -110,
    marginTop: -110,
  },
});

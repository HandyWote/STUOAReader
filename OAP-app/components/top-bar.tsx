// 顶部导航栏组件
// 主要功能：显示页面标题、日期和通知按钮，支持首页和探索页两种样式变体
import React from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Bell } from 'phosphor-react-native';

import { colors } from '@/constants/palette';

// 顶部栏变体类型：首页或探索页
type TopBarVariant = 'home' | 'explore';

// 顶部栏属性类型
type TopBarProps = {
  variant: TopBarVariant; // 变体类型
  title: string; // 页面标题
  dateText: string; // 日期文本
  isScrolled?: boolean; // 是否已滚动（首页）
  hasUnread?: boolean; // 是否有未读通知
  onPressAction?: () => void; // 通知按钮点击回调
};

export function TopBar({
  variant,
  title,
  dateText,
  isScrolled = false,
  hasUnread = false,
  onPressAction,
}: TopBarProps) {
  // 首页变体：显示标题、日期和通知按钮
  if (variant === 'home') {
    return (
      <View style={styles.homeWrap}>
        <BlurView intensity={60} tint="light" style={styles.homeBlur}>
          <View style={[styles.homeBar, isScrolled && styles.homeBarScrolled]}>
            <View>
              {/* 左侧：日期 + 标题 */}
              <View style={styles.dateRowHome}>
                <View style={styles.dateDot} />
                <Text style={styles.dateTextHome}>{dateText}</Text>
              </View>
              <Text style={styles.homeTitle}>{title}</Text>
            </View>
            {/* 右侧：铃铛按钮 */}
            <Pressable style={styles.bellButton} onPress={onPressAction}>
              <Bell size={18} color={colors.stone400} weight="fill" />
              {hasUnread && <View style={styles.bellDot} />}
            </Pressable>
          </View>
        </BlurView>
      </View>
    );
  }

  // 探索页变体：仅显示标题和日期
  return (
    <View style={styles.exploreWrap}>
      <BlurView intensity={60} tint="light" style={styles.exploreBlur}>
        <View style={styles.exploreBar}>
          <View>
            <View style={styles.dateRowExplore}>
              <View style={styles.dateDot} />
              <Text style={styles.dateTextExplore}>{dateText}</Text>
            </View>
            <Text style={styles.exploreTitle}>{title}</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 首页顶部栏容器样式：绝对定位，iOS向下偏移20px适配安全区域
  homeWrap: {
    position: 'absolute',
    // iOS往下移20px适配安全区域，Android保持0
    top: Platform.OS === 'ios' ? -20 : 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  // 首页模糊背景容器样式
  homeBlur: {
    paddingHorizontal: 20,
    // iOS加更多顶部内边距适配安全区域
    paddingTop: Platform.OS === 'ios' ? 20 : 18,
    paddingBottom: 10,
  },
  // 首页导航栏内容样式：横向排列
  homeBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderRadius: 28,
  },
  // 首页滚动后样式：白色半透明背景
  homeBarScrolled: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  // 探索页顶部栏容器样式
  exploreWrap: {
    paddingTop: 44,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  // 探索页模糊背景样式
  exploreBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  // 探索页导航栏内容样式
  exploreBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  // 首页日期行样式
  dateRowHome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  // 探索页日期行样式
  dateRowExplore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // 日期圆点样式
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold400,
  },
  // 首页日期文本样式
  dateTextHome: {
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.imperial600,
  },
  // 探索页日期文本样式
  dateTextExplore: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.imperial600,
    textTransform: 'uppercase',
  },
  // 首页标题样式
  homeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.stone900,
  },
  // 探索页标题样式
  exploreTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: colors.stone900,
  },
  // 铃铛按钮样式
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  // 未读通知红点样式
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.imperial500,
    borderWidth: 1,
    borderColor: colors.white,
  },
});

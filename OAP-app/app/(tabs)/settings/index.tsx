// 个人中心设置页面
// 主要功能：展示用户信息、VIP状态、通知管理和退出登录功能
import React, { useCallback, useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // 渐变背景组件
import { useRouter } from 'expo-router'; // 路由导航
import { BellRinging, CaretRight } from 'phosphor-react-native'; // 图标组件

import { AmbientBackground } from '@/components/ambient-background'; // 背景效果组件
import { BottomDock } from '@/components/bottom-dock'; // 底部导航组件
import { TopBar } from '@/components/top-bar'; // 顶部导航栏组件
import { colors } from '@/constants/palette'; // 颜色常量
import { useUserProfile } from '@/hooks/use-user-profile'; // 用户资料自定义Hook
import { setAuthToken } from '@/hooks/use-auth-token'; // 设置认证令牌
import { clearAuthStorage } from '@/storage/auth-storage'; // 认证存储
import { disableNotifications } from '@/notifications/notification-task'; // 禁用通知
import { setNotificationsEnabled } from '@/notifications/notification-storage'; // 设置通知启用状态
import { formatDateLabel } from '@/utils/date'; // 日期格式化工具

// 设置页面组件定义
export default function SettingsScreen() {
  const router = useRouter(); // 路由实例，用于页面导航
  const profile = useUserProfile(); // 获取用户资料

  // 计算显示名称：优先使用display_name，其次是username，最后是默认值
  const displayName = profile?.display_name || profile?.username || '用户';
  // 计算用户头像的首字母
  const initials = displayName.trim().charAt(0) || '?';
  // 解析VIP过期时间
  const vipExpiredAt = profile?.vip_expired_at ? new Date(profile.vip_expired_at) : null;
  // 检查VIP过期时间是否有效
  const vipExpiredAtValid = vipExpiredAt ? !Number.isNaN(vipExpiredAt.getTime()) : false;
  // 判断VIP是否激活：用户是VIP且未过期或无有效过期时间
  const isVipActive = 
    !!profile?.is_vip && (!vipExpiredAt || !vipExpiredAtValid || vipExpiredAt > new Date());
  // 判断VIP是否过期：用户是VIP且有有效过期时间且已过期
  const isVipExpired = !!profile?.is_vip && vipExpiredAtValid && vipExpiredAt <= new Date();

  // 根据VIP状态计算显示的标签
  const vipTag = useMemo(() => {
    if (isVipActive) {
      return { text: 'VIP Access', style: styles.vipActiveTag, textStyle: styles.vipActiveText };
    }
    if (isVipExpired) {
      return { text: '已过期', style: styles.vipExpiredTag, textStyle: styles.vipExpiredText };
    }
    return null;
  }, [isVipActive, isVipExpired]);

  // 处理退出登录的回调函数
  const handleLogout = useCallback(async () => {
    await clearAuthStorage(); // 清理认证存储
    await setAuthToken(null); // 设置认证令牌为null
    await setNotificationsEnabled(false); // 禁用通知
    await disableNotifications(); // 实际禁用通知任务
    router.replace('/login'); // 跳转到登录页面
  }, [router]);

  return (
    // 主容器
    <View style={styles.safeArea}>
      // 背景效果组件
      <AmbientBackground variant="explore" />
      // 顶部导航栏
      <TopBar variant="explore" title="个人中心" dateText={formatDateLabel()} />

      // 可滚动内容区域
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        // 用户资料区块
        <View style={styles.profileBlock}>
          // 用户头像：使用渐变色边框
          <LinearGradient
            colors={[colors.gold300, colors.imperial100]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarRing}
          >
            <View style={styles.avatarInner}>
              // 显示用户首字母
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </LinearGradient>
          // 显示用户名
          <Text style={styles.profileName}>{displayName}</Text>
          // 显示VIP标签（如果有）
          {vipTag && (
            <View style={[styles.vipTagBase, vipTag.style]}>
              <Text style={[styles.vipTagTextBase, vipTag.textStyle]}>{vipTag.text}</Text>
            </View>
          )}
        </View>

        // 设置卡片
        <View style={styles.card}>
          // 通知管理选项
          <Pressable
            onPress={() => router.push('/(tabs)/settings/notifications')}
            style={({ pressed }) => [styles.cardRow, pressed && styles.cardRowPressed]}
          >
            <View style={styles.cardRowLeft}>
              <View style={styles.cardIcon}>
                <BellRinging size={16} color={colors.stone600} weight="fill" />
              </View>
              <Text style={styles.cardRowText}>通知管理</Text>
            </View>
            <CaretRight size={16} color={colors.stone300} weight="bold" />
          </Pressable>
        </View>

        // 退出登录按钮
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </ScrollView>

      // 底部导航栏
      <BottomDock
        activeTab="settings"
        onHome={() => router.push('/(tabs)')}
        onAi={() => router.push('/(tabs)/explore')}
        onSettings={() => undefined}
      />
    </View>
  );
}

// 样式定义
const styles = StyleSheet.create({
  // 主容器样式
  safeArea: {
    flex: 1, // 占满整个屏幕
    backgroundColor: colors.surface, // 背景颜色
  },
  // 滚动内容样式
  content: {
    paddingTop: 16, // 顶部内边距
    paddingHorizontal: 20, // 水平内边距
    paddingBottom: 140, // 底部内边距（为底部导航栏留出空间）
    gap: 20, // 子元素间距
  },
  // 用户资料区块样式
  profileBlock: {
    alignItems: 'center', // 水平居中
    gap: 10, // 子元素间距
  },
  // 头像外边框样式
  avatarRing: {
    width: 96, // 宽度
    height: 96, // 高度
    borderRadius: 48, // 圆形
    padding: 4, // 内边距
    ...Platform.select({
      ios: {
        shadowColor: colors.gold200, // 阴影颜色
        shadowOpacity: 0.6, // 阴影透明度
        shadowRadius: 10, // 阴影半径
        shadowOffset: { width: 0, height: 6 }, // 阴影偏移
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 6px 10px rgba(243, 224, 175, 0.6)',
      },
    }),
  },
  // 头像内部样式
  avatarInner: {
    flex: 1, // 占满可用空间
    borderRadius: 44, // 圆形
    backgroundColor: colors.white, // 背景颜色
    alignItems: 'center', // 水平居中
    justifyContent: 'center', // 垂直居中
  },
  // 头像文字样式
  avatarText: {
    fontSize: 22, // 字体大小
    fontWeight: '800', // 字体粗细
    color: colors.stone900, // 文字颜色
  },
  // 用户名样式
  profileName: {
    fontSize: 18, // 字体大小
    fontWeight: '700', // 字体粗细
    color: colors.stone900, // 文字颜色
  },
  // VIP标签基础样式
  vipTagBase: {
    paddingHorizontal: 12, // 水平内边距
    paddingVertical: 4, // 垂直内边距
    borderRadius: 999, // 圆角
    borderWidth: 1, // 边框宽度
  },
  // VIP标签文字基础样式
  vipTagTextBase: {
    fontSize: 10, // 字体大小
    fontWeight: '700', // 字体粗细
    letterSpacing: 2, // 字间距
  },
  // 激活VIP标签样式
  vipActiveTag: {
    backgroundColor: colors.gold50, // 背景颜色
    borderColor: colors.gold200, // 边框颜色
  },
  // 激活VIP标签文字样式
  vipActiveText: {
    color: colors.gold600, // 文字颜色
  },
  // 过期VIP标签样式
  vipExpiredTag: {
    backgroundColor: colors.imperial50, // 背景颜色
    borderColor: colors.imperial100, // 边框颜色
  },
  // 过期VIP标签文字样式
  vipExpiredText: {
    color: colors.imperial600, // 文字颜色
  },
  // 设置卡片样式
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)', // 半透明白色背景
    borderRadius: 32, // 圆角
    borderWidth: 1, // 边框宽度
    borderColor: 'rgba(255,255,255,0.8)', // 边框颜色
    padding: 8, // 内边距
    ...Platform.select({
      ios: {
        shadowColor: '#000', // 阴影颜色
        shadowOpacity: 0.04, // 阴影透明度
        shadowRadius: 10, // 阴影半径
        shadowOffset: { width: 0, height: 6 }, // 阴影偏移
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  // 卡片行样式
  cardRow: {
    flexDirection: 'row', // 横向排列
    alignItems: 'center', // 垂直居中
    justifyContent: 'space-between', // 两端对齐
    padding: 16, // 内边距
    borderRadius: 24, // 圆角
  },
  // 卡片行按下样式
  cardRowPressed: {
    backgroundColor: colors.white, // 背景颜色
  },
  // 卡片行左侧内容样式
  cardRowLeft: {
    flexDirection: 'row', // 横向排列
    alignItems: 'center', // 垂直居中
    gap: 12, // 子元素间距
  },
  // 卡片图标样式
  cardIcon: {
    width: 32, // 宽度
    height: 32, // 高度
    borderRadius: 16, // 圆形
    backgroundColor: colors.stone100, // 背景颜色
    alignItems: 'center', // 水平居中
    justifyContent: 'center', // 垂直居中
  },
  // 卡片行文字样式
  cardRowText: {
    fontSize: 14, // 字体大小
    fontWeight: '600', // 字体粗细
    color: colors.stone700, // 文字颜色
  },
  // 退出登录按钮样式
  logoutButton: {
    paddingVertical: 14, // 垂直内边距
    borderRadius: 18, // 圆角
    backgroundColor: colors.white, // 背景颜色
    borderWidth: 1, // 边框宽度
    borderColor: colors.imperial100, // 边框颜色
    alignItems: 'center', // 水平居中
    ...Platform.select({
      ios: {
        shadowColor: '#000', // 阴影颜色
        shadowOpacity: 0.04, // 阴影透明度
        shadowRadius: 10, // 阴影半径
        shadowOffset: { width: 0, height: 6 }, // 阴影偏移
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  // 退出登录按钮按下样式
  logoutPressed: {
    transform: [{ scale: 0.98 }], // 轻微缩小效果
  },
  // 退出登录按钮文字样式
  logoutText: {
    color: colors.imperial600, // 文字颜色
    fontSize: 12, // 字体大小
    fontWeight: '700', // 字体粗细
  },
});

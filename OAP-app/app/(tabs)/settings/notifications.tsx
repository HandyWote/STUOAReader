// 通知管理设置页面
// 主要功能：允许用户开启/关闭系统通知，处理通知权限申请和设置
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { BellRinging, CaretLeft } from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { TopBar } from '@/components/top-bar';
import { colors } from '@/constants/palette';
import { isExpoGo } from '@/notifications/notification-env';
import { registerNotificationTask, disableNotifications } from '@/notifications/notification-task';
import { getNotificationsEnabled, setNotificationsEnabled } from '@/notifications/notification-storage';
import { formatDateLabel } from '@/utils/date';

// 通知设置屏幕组件
export default function NotificationSettingsScreen() {
  const router = useRouter(); // 路由实例，用于页面导航
  const [enabled, setEnabled] = useState(false); // 通知是否启用的状态

  // 加载通知启用状态的函数
  const loadEnabled = useCallback(async () => {
    const stored = await getNotificationsEnabled(); // 从存储中获取通知设置
    setEnabled(stored); // 更新状态
  }, []);

  // 组件挂载时加载通知状态
  useEffect(() => {
    loadEnabled();
  }, [loadEnabled]);

  // 打开设置提示框的函数
  const openSettingsPrompt = useCallback(() => {
    Alert.alert('提示', '是否前往设置授予通知权限？', [
      { text: '取消', style: 'cancel' },
      { text: '前往设置', onPress: () => Linking.openSettings() },
    ]);
  }, []);

  // 处理通知开关切换的函数
  const handleToggle = useCallback(
    async (nextValue: boolean) => {
      // 只支持 Android 平台的通知
      if (Platform.OS !== 'android') {
        return;
      }
      
      if (nextValue) {
        // 如果是 Expo Go 环境，不支持通知
        if (isExpoGo()) {
          Alert.alert('提示', 'Expo Go 不支持通知，请使用开发构建。');
          return;
        }
        
        // 动态导入通知模块以优化性能
        const Notifications = await import('expo-notifications');
        // 检查通知权限
        const permission = await Notifications.getPermissionsAsync();
        
        if (permission.granted) {
          // 如果有权限，启用通知
          setEnabled(true);
          await setNotificationsEnabled(true); // 保存设置到存储
          await registerNotificationTask(); // 注册通知任务
          return;
        }
        
        // 如果没有权限，提示用户前往设置
        openSettingsPrompt();
        return;
      }
      
      // 禁用通知的情况
      setEnabled(false);
      await setNotificationsEnabled(false); // 保存设置到存储
      await disableNotifications(); // 禁用通知任务
    },
    [openSettingsPrompt]
  );

  return (
    // 主容器
    <View style={styles.safeArea}>
      // 背景效果组件
      <AmbientBackground variant="explore" />
      // 顶部导航栏
      <TopBar variant="explore" title="通知管理" dateText={formatDateLabel()} />

      // 内容区域
      <View style={styles.content}>
        // 设置卡片
        <View style={styles.card}>
          // 卡片行
          <View style={styles.cardRow}>
            // 左侧图标和文字
            <View style={styles.cardRowLeft}>
              <View style={styles.cardIcon}>
                <BellRinging size={16} color={colors.stone600} weight="fill" />
              </View>
              <Text style={styles.cardRowText}>系统通知</Text>
            </View>
            // 通知开关
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={Platform.OS !== 'android'} // 仅在Android上可用
              trackColor={{ false: colors.stone200, true: colors.gold100 }}
              thumbColor={enabled ? colors.gold500 : colors.stone300}
            />
          </View>
        </View>

        // 返回按钮
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CaretLeft size={16} color={colors.stone500} weight="bold" />
          <Text style={styles.backText}>返回</Text>
        </Pressable>
      </View>
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
  // 内容区域样式
  content: {
    paddingTop: 16, // 顶部内边距
    paddingHorizontal: 20, // 水平内边距
    gap: 16, // 子元素间距
  },
  // 设置卡片样式
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)', // 半透明白色背景
    borderRadius: 32, // 圆角
    borderWidth: 1, // 边框宽度
    borderColor: 'rgba(255,255,255,0.8)', // 边框颜色
    padding: 8, // 内边距
    shadowColor: '#000', // 阴影颜色
    shadowOpacity: 0.04, // 阴影透明度
    shadowRadius: 10, // 阴影半径
    shadowOffset: { width: 0, height: 6 }, // 阴影偏移
  },
  // 卡片行样式
  cardRow: {
    flexDirection: 'row', // 横向排列
    alignItems: 'center', // 垂直居中
    justifyContent: 'space-between', // 两端对齐
    padding: 16, // 内边距
    borderRadius: 24, // 圆角
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
  // 返回按钮样式
  backButton: {
    alignSelf: 'flex-start', // 左对齐
    flexDirection: 'row', // 横向排列
    alignItems: 'center', // 垂直居中
    gap: 6, // 子元素间距
    paddingVertical: 10, // 垂直内边距
    paddingHorizontal: 12, // 水平内边距
    borderRadius: 999, // 圆形
    backgroundColor: colors.white, // 背景颜色
    borderWidth: 1, // 边框宽度
    borderColor: colors.stone100, // 边框颜色
  },
  // 返回按钮文字样式
  backText: {
    fontSize: 12, // 字体大小
    fontWeight: '600', // 字体粗细
    color: colors.stone500, // 文字颜色
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretLeft, Code } from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { TopBar } from '@/components/top-bar';
import { colors } from '@/constants/palette';
import { shadows } from '@/constants/shadows';
import { useUserProfile } from '@/hooks/use-user-profile';
import { triggerTestNotification } from '@/notifications/notification-task';
import {
  clearNotificationLogs,
  getNotificationLogs,
  NotificationPollLog,
} from '@/notifications/notification-log';
import { formatDateLabel } from '@/utils/date';

const statusLabels: Record<string, string> = {
  unsupported: '不支持',
  disabled: '已关闭',
  out_of_window: '不在时间窗',
  rate_limited: '节流中',
  auth_expired: '登录过期',
  not_modified: '无变化',
  http_error: '请求失败',
  no_articles: '空列表',
  no_new_items: '无新增',
  new_articles: '有新增',
  exception: '异常',
  manual_test: '手动测试',
  manual_test_blocked: '测试受限',
};

function formatLogTime(value?: string) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function DeveloperSettingsScreen() {
  const router = useRouter();
  const profile = useUserProfile();
  const displayName = profile?.display_name || profile?.username || '';
  const isAdmin = displayName.trim().toLowerCase() === 'admin';
  const [logs, setLogs] = useState<NotificationPollLog[]>([]);

  const loadLogs = useCallback(async () => {
    const next = await getNotificationLogs();
    setLogs(next);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleTestNotification = useCallback(async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('提示', '仅 Android 支持系统通知测试。');
      return;
    }
    const result = await triggerTestNotification();
    if (!result.ok) {
      Alert.alert('提示', '当前环境不支持通知测试，请使用开发构建。');
    } else {
      Alert.alert('提示', '已触发模拟通知。');
    }
    await loadLogs();
  }, [loadLogs]);

  const handleClearLogs = useCallback(async () => {
    await clearNotificationLogs();
    await loadLogs();
  }, [loadLogs]);

  const logItems = useMemo(() => logs, [logs]);

  if (!isAdmin) {
    return (
      <View style={styles.safeArea}>
        <AmbientBackground variant="explore" />
        <TopBar variant="explore" title="开发者模式" dateText={formatDateLabel()} />
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardRowText}>仅管理员可访问该页面。</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={16} color={colors.stone500} weight="bold" />
            <Text style={styles.backText}>返回</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <AmbientBackground variant="explore" />
      <TopBar variant="explore" title="开发者模式" dateText={formatDateLabel()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Code size={16} color={colors.stone600} weight="fill" />
            </View>
            <Text style={styles.cardTitle}>通知调试</Text>
          </View>
          <Text style={styles.cardDesc}>用于模拟系统通知与查看轮询记录。</Text>
          <View style={styles.cardActions}>
            <Pressable onPress={handleTestNotification} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>模拟新文章通知</Text>
            </Pressable>
            <Pressable onPress={handleClearLogs} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>清空记录</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.logCard}>
          <Text style={styles.logTitle}>轮询记录</Text>
          {logItems.length === 0 ? (
            <Text style={styles.logEmpty}>暂无记录</Text>
          ) : (
            <View style={styles.logList}>
              {logItems.map((item) => (
                <View key={item.id} style={styles.logRow}>
                  <View style={styles.logRowHeader}>
                    <Text style={styles.logTime}>{formatLogTime(item.at)}</Text>
                    <Text style={styles.logStatus}>
                      {statusLabels[item.status] || item.status}
                    </Text>
                  </View>
                  {item.detail ? <Text style={styles.logDetail}>{item.detail}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CaretLeft size={16} color={colors.stone500} weight="bold" />
          <Text style={styles.backText}>返回</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: 16,
    gap: 12,
    ...shadows.cardSoft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.stone100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.stone800,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.stone600,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.gold400,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.stone900,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.stone600,
  },
  logCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: 16,
    gap: 12,
    ...shadows.cardSoft,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.stone800,
  },
  logEmpty: {
    fontSize: 12,
    color: colors.stone500,
  },
  logList: {
    gap: 10,
  },
  logRow: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  logRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  logTime: {
    fontSize: 11,
    color: colors.stone500,
  },
  logStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.stone700,
  },
  logDetail: {
    marginTop: 6,
    fontSize: 12,
    color: colors.stone700,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone100,
  },
  backText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.stone500,
  },
  cardRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.stone700,
  },
});

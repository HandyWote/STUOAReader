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

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);

  const loadEnabled = useCallback(async () => {
    const stored = await getNotificationsEnabled();
    setEnabled(stored);
  }, []);

  useEffect(() => {
    loadEnabled();
  }, [loadEnabled]);

  const openSettingsPrompt = useCallback(() => {
    Alert.alert('提示', '是否前往设置授予通知权限？', [
      { text: '取消', style: 'cancel' },
      { text: '前往设置', onPress: () => Linking.openSettings() },
    ]);
  }, []);

  const handleToggle = useCallback(
    async (nextValue: boolean) => {
      if (Platform.OS !== 'android') {
        return;
      }
      
      if (nextValue) {
        if (isExpoGo()) {
          Alert.alert('提示', 'Expo Go 不支持通知，请使用开发构建。');
          return;
        }
        
        const Notifications = await import('expo-notifications');
        const permission = await Notifications.getPermissionsAsync();
        
        if (permission.granted) {
          setEnabled(true);
          await setNotificationsEnabled(true);
          await registerNotificationTask();
          return;
        }
        
        openSettingsPrompt();
        return;
      }
      
      setEnabled(false);
      await setNotificationsEnabled(false);
      await disableNotifications();
    },
    [openSettingsPrompt]
  );

  return (
    <View style={styles.safeArea}>
      <AmbientBackground variant="explore" />
      <TopBar variant="explore" title="通知管理" dateText={formatDateLabel()} />

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <View style={styles.cardIcon}>
                <BellRinging size={16} color={colors.stone600} weight="fill" />
              </View>
              <Text style={styles.cardRowText}>系统通知</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={Platform.OS !== 'android'}
              trackColor={{ false: colors.stone200, true: colors.gold100 }}
              thumbColor={enabled ? colors.gold500 : colors.stone300}
            />
          </View>
        </View>

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CaretLeft size={16} color={colors.stone500} weight="bold" />
          <Text style={styles.backText}>返回</Text>
        </Pressable>
      </View>
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
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 24,
  },
  cardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.stone100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowText: {
    fontSize: 14,
    fontWeight: '600',
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
});

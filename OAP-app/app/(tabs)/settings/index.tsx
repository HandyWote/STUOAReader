import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BellRinging, CaretRight } from 'phosphor-react-native';
import * as SecureStore from 'expo-secure-store';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { TopBar } from '@/components/top-bar';
import { colors } from '@/constants/palette';
import { useUserProfile } from '@/hooks/use-user-profile';
import { setAuthToken } from '@/hooks/use-auth-token';
import { disableNotifications } from '@/notifications/notification-task';
import { setNotificationsEnabled } from '@/notifications/notification-storage';
import { formatDateLabel } from '@/utils/date';

export default function SettingsScreen() {
  const router = useRouter();
  const profile = useUserProfile();

  const displayName = profile?.display_name || profile?.username || '用户';
  const initials = displayName.trim().charAt(0) || '?';
  const vipExpiredAt = profile?.vip_expired_at ? new Date(profile.vip_expired_at) : null;
  const vipExpiredAtValid = vipExpiredAt ? !Number.isNaN(vipExpiredAt.getTime()) : false;
  const isVipActive =
    !!profile?.is_vip && (!vipExpiredAt || !vipExpiredAtValid || vipExpiredAt > new Date());
  const isVipExpired = !!profile?.is_vip && vipExpiredAtValid && vipExpiredAt <= new Date();

  const vipTag = useMemo(() => {
    if (isVipActive) {
      return { text: 'VIP Access', style: styles.vipActiveTag, textStyle: styles.vipActiveText };
    }
    if (isVipExpired) {
      return { text: '已过期', style: styles.vipExpiredTag, textStyle: styles.vipExpiredText };
    }
    return null;
  }, [isVipActive, isVipExpired]);

  const handleLogout = useCallback(async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    setAuthToken(null);
    await setNotificationsEnabled(false);
    await disableNotifications();
    router.replace('/login');
  }, [router]);

  return (
    <View style={styles.safeArea}>
      <AmbientBackground variant="explore" />
      <TopBar variant="explore" title="个人中心" dateText={formatDateLabel()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileBlock}>
          <LinearGradient
            colors={[colors.gold300, colors.imperial100]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarRing}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </LinearGradient>
          <Text style={styles.profileName}>{displayName}</Text>
          {vipTag && (
            <View style={[styles.vipTagBase, vipTag.style]}>
              <Text style={[styles.vipTagTextBase, vipTag.textStyle]}>{vipTag.text}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
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

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </ScrollView>

      <BottomDock
        activeTab="settings"
        onHome={() => router.push('/(tabs)')}
        onAi={() => router.push('/(tabs)/explore')}
        onSettings={() => undefined}
      />
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
    paddingBottom: 140,
    gap: 20,
  },
  profileBlock: {
    alignItems: 'center',
    gap: 10,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 4,
    shadowColor: colors.gold200,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  avatarInner: {
    flex: 1,
    borderRadius: 44,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.stone900,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.stone900,
  },
  vipTagBase: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  vipTagTextBase: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  vipActiveTag: {
    backgroundColor: colors.gold50,
    borderColor: colors.gold200,
  },
  vipActiveText: {
    color: colors.gold600,
  },
  vipExpiredTag: {
    backgroundColor: colors.imperial50,
    borderColor: colors.imperial100,
  },
  vipExpiredText: {
    color: colors.imperial600,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 24,
  },
  cardRowPressed: {
    backgroundColor: colors.white,
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
  logoutButton: {
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.imperial100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  logoutPressed: {
    transform: [{ scale: 0.98 }],
  },
  logoutText: {
    color: colors.imperial600,
    fontSize: 12,
    fontWeight: '700',
  },
});

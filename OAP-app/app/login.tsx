import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const colors = {
  surface: '#FDFCF8',
  gold50: '#FBF7E8',
  gold400: '#D4AF37',
  gold500: '#B8860B',
  gold600: '#926F34',
  imperial500: '#C02425',
  imperial600: '#9B1C1C',
  stone800: '#1C1917',
  stone700: '#2B211E',
  stone500: '#6B6461',
  stone300: '#C8C2BF',
  white: '#FFFFFF',
};

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const resp = await fetch(`${apiBaseUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error || '登录失败，请检查账号或密码');
        return;
      }

      await SecureStore.setItemAsync('access_token', data.access_token || '');
      await SecureStore.setItemAsync('refresh_token', data.refresh_token || '');
      await SecureStore.setItemAsync('user_profile', JSON.stringify(data.user || {}));

      router.replace('/(tabs)');
    } catch (err) {
      setError('网络异常，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.ambientBg}>
        <View style={[styles.orb, styles.orbGold]} />
        <View style={[styles.orb, styles.orbRed]} />
        <View style={[styles.orb, styles.orbWarm]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="shield-check" size={28} color={colors.gold50} />
            </View>
            <Text style={styles.title}>
              OA{'\n'}
              <Text style={styles.titleAccent}>Reader.</Text>
            </Text>
            <Text style={styles.subtitle}>每日摘要 · 尊享智能</Text>
          </View>

          <View style={styles.formBlock}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>账号</Text>
              <View style={styles.inputShell}>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="请输入账号"
                  placeholderTextColor={colors.stone300}
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>密码</Text>
              <View style={styles.inputShell}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="请输入密码"
                  placeholderTextColor={colors.stone300}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable onPress={handleLogin} style={({ pressed }) => [
              styles.loginButton,
              isSubmitting && styles.loginButtonDisabled,
              pressed && styles.loginButtonPressed,
            ]} disabled={isSubmitting}>
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.gold400} />
                  <Text style={styles.loginButtonText}>登录中...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>登录</Text>
                  <View style={styles.loginButtonIcon}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.gold400} />
                  </View>
                </>
              )}
            </Pressable>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.secureRow}>
              <MaterialCommunityIcons name="shield-check" size={14} color={colors.gold500} />
              <Text style={styles.secureText}>ENTERPRISE SECURE</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  ambientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orbGold: {
    width: 320,
    height: 320,
    backgroundColor: '#F5EBC9',
    top: -60,
    left: -60,
  },
  orbRed: {
    width: 320,
    height: 320,
    backgroundColor: '#F9D7D7',
    bottom: -40,
    right: -40,
  },
  orbWarm: {
    width: 220,
    height: 220,
    backgroundColor: '#FDEED6',
    top: '48%',
    left: '50%',
    marginLeft: -110,
    marginTop: -110,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 44,
    paddingBottom: 72,
    justifyContent: 'flex-start',
  },
  brandBlock: {
    gap: 12,
    marginBottom: 36,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.imperial600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: colors.imperial500,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.stone800,
    lineHeight: 46,
    letterSpacing: -1,
  },
  titleAccent: {
    color: colors.gold500,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.stone500,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  formBlock: {
    gap: 18,
    paddingBottom: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.imperial600,
    letterSpacing: 1,
  },
  inputShell: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  input: {
    height: 48,
    fontSize: 15,
    color: colors.stone800,
    fontWeight: '500',
  },
  loginButton: {
    height: 64,
    backgroundColor: colors.stone800,
    borderRadius: 32,
    paddingLeft: 28,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.stone700,
    shadowColor: colors.stone700,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  loginButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: colors.gold50,
    fontSize: 18,
    fontWeight: '700',
  },
  loginButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    opacity: 0.7,
  },
  secureText: {
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: '700',
    color: colors.stone500,
  },
  errorText: {
    color: colors.imperial600,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

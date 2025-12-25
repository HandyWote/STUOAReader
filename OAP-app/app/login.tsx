/**
 * 登录页面
 * 核心功能：
 * 1. 用户账号密码输入验证
 * 2. 登录请求发送与响应处理
 * 3. 认证令牌存储与管理
 * 4. 登录成功后的页面跳转
 * 5. 错误信息显示与处理
 * 6. 加载状态展示
 * 7. 键盘适配与响应式布局
 */

import React, { useState } from 'react';
import {
  ActivityIndicator, // 加载指示器
  KeyboardAvoidingView, // 键盘避免视图
  Platform, // 平台检测
  Pressable, // 可按压组件
  ScrollView, // 滚动视图
  StyleSheet, // 样式表
  Text, // 文本组件
  TextInput, // 文本输入框
  View, // 视图组件
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // 安全区域视图
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Expo图标库
import { useRouter } from 'expo-router'; // 路由导航
import * as SecureStore from 'expo-secure-store'; // 安全存储

// 导入自定义组件和工具
import { AmbientBackground } from '@/components/ambient-background'; // 背景效果组件
import { colors } from '@/constants/palette'; // 颜色常量
import { getApiBaseUrl } from '@/services/api'; // 获取API基础URL
import { setAuthToken } from '@/hooks/use-auth-token'; // 设置认证令牌

/**
 * 登录页面组件
 */
export default function LoginScreen() {
  // 路由实例，用于页面跳转
  const router = useRouter();
  // 用户名输入状态
  const [username, setUsername] = useState('');
  // 密码输入状态
  const [password, setPassword] = useState('');
  // 错误信息状态
  const [error, setError] = useState('');
  // 提交状态（用于显示加载指示器）
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取API基础URL
  const apiBaseUrl = getApiBaseUrl();

  /**
   * 处理登录请求
   * 1. 验证输入
   * 2. 发送登录请求
   * 3. 处理响应
   * 4. 存储令牌
   * 5. 跳转到主页面
   */
  const handleLogin = async () => {
    // 验证输入是否为空
    if (!username.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }

    // 清空错误信息并设置提交状态
    setError('');
    setIsSubmitting(true);

    console.log('[Login] 开始登录流程');
    console.log('[Login] API URL:', `${apiBaseUrl}/auth/token`);
    console.log('[Login] 用户名:', username.trim());

    try {
      // 发送登录请求
      const resp = await fetch(`${apiBaseUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      console.log('[Login] 响应状态码:', resp.status);

      // 解析响应数据
      const data = await resp.json();
      console.log('[Login] 响应数据:', data);

      // 处理错误响应
      if (!resp.ok) {
        setError(data?.error || '登录失败，请检查账号或密码');
        return;
      }

      console.log('[Login] 登录成功，存储令牌');

      // 存储认证令牌和用户信息
      await SecureStore.setItemAsync('access_token', data.access_token || '');
      await SecureStore.setItemAsync('refresh_token', data.refresh_token || '');
      await SecureStore.setItemAsync('user_profile', JSON.stringify(data.user || {}));
      // 更新认证令牌状态
      setAuthToken(data.access_token || null);

      console.log('[Login] 跳转到主页面');

      // 登录成功，跳转到主页面
      router.replace('/(tabs)');
    } catch (err) {
      // 处理网络异常
      console.error('[Login] 登录异常:', err);
      setError('网络异常，请稍后重试');
    } finally {
      // 无论成功失败，都结束提交状态
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 背景效果 */}
      <AmbientBackground variant="login" />

      {/* 键盘避免视图 */}
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}>
        {/* 滚动视图（处理键盘弹出时的内容滚动） */}
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* 品牌信息区块 */}
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

          {/* 登录表单区块 */}
          <View style={styles.formBlock}>
            {/* 用户名输入组 */}
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

            {/* 密码输入组 */}
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

            {/* 登录按钮 */}
            <Pressable onPress={handleLogin} style={({ pressed }) => [
              styles.loginButton,
              isSubmitting && styles.loginButtonDisabled,
              pressed && styles.loginButtonPressed,
            ]} disabled={isSubmitting}>
              {/* 加载状态显示 */}
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.gold400} />
                  <Text style={styles.loginButtonText}>登录中...</Text>
                </View>
              ) : (
                // 正常状态显示
                <>
                  <Text style={styles.loginButtonText}>登录</Text>
                  <View style={styles.loginButtonIcon}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.gold400} />
                  </View>
                </>
              )}
            </Pressable>
            {/* 错误信息显示 */}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* 安全认证标识 */}
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
    color: colors.stone900,
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
    color: colors.stone900,
    fontWeight: '500',
  },
  loginButton: {
    height: 64,
    backgroundColor: colors.stone900,
    borderRadius: 32,
    paddingLeft: 28,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.stone800,
    shadowColor: colors.stone800,
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

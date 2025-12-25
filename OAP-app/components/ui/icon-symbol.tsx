// 图标组件（Android/Web 平台回退实现）
// 主要功能：在 Android 和 Web 平台上使用 Material Icons 渲染图标，保持跨平台一致性
// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// 图标映射类型：将 SF Symbols 名称映射到 Material Icons 名称
type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
// 图标名称类型：从映射中提取所有可用的图标名称
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
// SF Symbols 到 Material Icons 的映射表
const MAPPING = {
  'house.fill': 'home', // 房子图标
  'paperplane.fill': 'send', // 发送图标
  'chevron.left.forwardslash.chevron.right': 'code', // 代码图标
  'chevron.right': 'chevron-right', // 右箭头图标
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
// 图标组件：在 iOS 上使用原生 SF Symbols，在 Android 和 Web 上使用 Material Icons
// 确保跨平台一致性和最佳资源使用
export function IconSymbol({
  name, // 图标名称（基于 SF Symbols）
  size = 24, // 图标大小，默认 24
  color, // 图标颜色
  style, // 自定义样式
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // 使用 Material Icons 渲染图标
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

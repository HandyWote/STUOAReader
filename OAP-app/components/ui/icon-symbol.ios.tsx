// 图标组件（iOS 平台原生实现）
// 主要功能：在 iOS 平台上使用原生 SF Symbols 渲染图标，提供最佳性能和视觉效果
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

// 图标组件：使用 iOS 原生 SF Symbols 渲染图标
export function IconSymbol({
  name, // 图标名称（SF Symbols 名称）
  size = 24, // 图标大小，默认 24
  color, // 图标颜色
  style, // 自定义样式
  weight = 'regular', // 图标粗细，默认 regular
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // 使用 SymbolView 渲染 SF Symbols 图标
  return (
    <SymbolView
      weight={weight} // 设置图标粗细
      tintColor={color} // 设置图标颜色
      resizeMode="scaleAspectFit" // 保持图标比例缩放
      name={name} // 图标名称
      style={[
        {
          width: size, // 设置宽度
          height: size, // 设置高度
        },
        style, // 应用自定义样式
      ]}
    />
  );
}

// 主题配置文件
// 主要功能：定义应用的颜色主题和字体配置，支持亮色和暗色两种模式
// 包含文本、背景、图标、标签栏等元素的颜色定义，以及不同平台的字体设置

import { Platform } from 'react-native';

// 亮色模式主题色（用于强调色和选中状态）
const tintColorLight = '#0a7ea4';
// 暗色模式主题色（用于强调色和选中状态）
const tintColorDark = '#fff';

// 应用颜色配置
export const Colors = {
  // 亮色模式颜色定义
  light: {
    text: '#11181C', // 文本颜色：深灰色，用于主要文本内容
    background: '#fff', // 背景色：白色，用于页面背景
    tint: tintColorLight, // 主题色：蓝色，用于强调元素和选中状态
    icon: '#687076', // 图标颜色：中灰色，用于未选中的图标
    tabIconDefault: '#687076', // 标签栏默认图标颜色：中灰色
    tabIconSelected: tintColorLight, // 标签栏选中图标颜色：蓝色
  },
  // 暗色模式颜色定义
  dark: {
    text: '#ECEDEE', // 文本颜色：浅灰色，用于主要文本内容
    background: '#151718', // 背景色：深灰色，用于页面背景
    tint: tintColorDark, // 主题色：白色，用于强调元素和选中状态
    icon: '#9BA1A6', // 图标颜色：浅灰色，用于未选中的图标
    tabIconDefault: '#9BA1A6', // 标签栏默认图标颜色：浅灰色
    tabIconSelected: tintColorDark, // 标签栏选中图标颜色：白色
  },
};

// 字体配置（根据平台选择不同的字体家族）
export const Fonts = Platform.select({
  // iOS 平台字体配置
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui', // 无衬线字体：系统默认字体
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif', // 衬线字体：用于正式文本
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded', // 圆角字体：用于友好的界面元素
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace', // 等宽字体：用于代码和数字显示
  },
  // 默认平台字体配置（Android 等）
  default: {
    sans: 'normal', // 无衬线字体：默认字体
    serif: 'serif', // 衬线字体：用于正式文本
    rounded: 'normal', // 圆角字体：使用默认字体
    mono: 'monospace', // 等宽字体：用于代码和数字显示
  },
  // Web 平台字体配置
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", // 无衬线字体：系统字体栈，优先使用系统字体
    serif: "Georgia, 'Times New Roman', serif", // 衬线字体：Georgia 和 Times New Roman
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif", // 圆角字体：支持多语言圆角字体
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", // 等宽字体：代码字体栈
  },
});

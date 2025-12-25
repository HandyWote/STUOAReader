// 触觉反馈标签按钮组件
// 主要功能：在iOS平台为底部标签栏按钮添加触觉反馈效果
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        // 仅在iOS平台启用触觉反馈
        if (process.env.EXPO_OS === 'ios') {
          // 按下标签时添加轻柔的触觉反馈
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

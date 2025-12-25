// 挥手动画组件
// 主要功能：显示一个挥手表情符号，带有旋转动画效果
import Animated from 'react-native-reanimated';

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        // 定义关键帧动画：在动画进行到50%时旋转25度
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        // 动画重复4次
        animationIterationCount: 4,
        // 动画持续时间300毫秒
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
}

// 外部链接组件
// 主要功能：在Web端打开新标签页，在原生端使用应用内浏览器打开外部链接
import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

// 外部链接属性类型：继承Link组件属性，排除href并重新定义为必填的字符串类型
type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        // 判断是否在Web环境
        if (process.env.EXPO_OS !== 'web') {
          // 阻止原生端默认在系统浏览器中打开链接的行为
          event.preventDefault();
          // 在应用内浏览器中打开链接
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}

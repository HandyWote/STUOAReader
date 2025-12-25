// Mermaid 图表脚本加载 Hook
// 主要功能：从本地资源加载 Mermaid 图表渲染脚本
// 使用 Expo Asset 和 FileSystem 读取脚本文件内容

import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

// Mermaid 脚本加载 Hook
export function useMermaidScript() {
  // Mermaid 脚本内容状态
  const [mermaidScript, setMermaidScript] = useState<string | null>(null);

  useEffect(() => {
    // 组件挂载标记，防止卸载后更新状态
    let mounted = true;
    // 加载 Mermaid 脚本
    const loadMermaid = async () => {
      try {
        // 从模块加载 Mermaid 脚本资源
        const asset = Asset.fromModule(require('../assets/mermaid.min.txt'));
        // 下载资源到本地
        await asset.downloadAsync();
        // 获取资源 URI
        const uri = asset.localUri ?? asset.uri;
        // 读取脚本内容
        const script = await FileSystem.readAsStringAsync(uri);
        // 如果组件仍挂载，更新脚本内容
        if (mounted) {
          setMermaidScript(script);
        }
      } catch {
        // 加载失败时设置为 null
        if (mounted) {
          setMermaidScript(null);
        }
      }
    };
    // 执行加载
    loadMermaid();
    // 清理函数：标记组件已卸载
    return () => {
      mounted = false;
    };
  }, []);

  return mermaidScript;
}

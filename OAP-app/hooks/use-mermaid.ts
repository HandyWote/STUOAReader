import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export function useMermaidScript() {
  const [mermaidScript, setMermaidScript] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadMermaid = async () => {
      try {
        const asset = Asset.fromModule(require('../assets/mermaid.min.txt'));
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        const script = await FileSystem.readAsStringAsync(uri);
        if (mounted) {
          setMermaidScript(script);
        }
      } catch {
        if (mounted) {
          setMermaidScript(null);
        }
      }
    };
    loadMermaid();
    return () => {
      mounted = false;
    };
  }, []);

  return mermaidScript;
}

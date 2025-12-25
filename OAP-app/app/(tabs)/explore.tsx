
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { Crown } from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { ArticleDetailSheet } from '@/components/article-detail-sheet';
import { BottomDock } from '@/components/bottom-dock';
import { ChatInput } from '@/components/chat-input';
import { ChatMessageItem } from '@/components/chat-message';
import { SourceList } from '@/components/source-list';
import { ThinkingIndicator } from '@/components/thinking-indicator';
import { TopBar } from '@/components/top-bar';
import { colors } from '@/constants/palette';
import { useAiChat } from '@/hooks/use-ai-chat';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useDisplayName } from '@/hooks/use-display-name';
import { useMermaidScript } from '@/hooks/use-mermaid';
import { buildArticleFromRelated, fetchArticleDetail } from '@/services/articles';
import { formatDateLabel, getDayPeriod } from '@/utils/date';
import type { Article, ArticleDetail, RelatedArticle } from '@/types/article';
const mermaidHtml = (diagram: string, script: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; padding: 0; background: transparent; }
      #container { padding: 8px; }
    </style>
    <script>${script}</script>
  </head>
  <body>
    <div id="container" class="mermaid">${diagram}</div>
    <script>
      mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
    </script>
  </body>
</html>`;

export default function AiAssistantScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [activeDetail, setActiveDetail] = useState<ArticleDetail | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const token = useAuthToken();
  const displayName = useDisplayName('用户');
  const mermaidScript = useMermaidScript();
  const { messages, isThinking, sendChat } = useAiChat(token);
  const insets = useSafeAreaInsets();

  const greeting = useMemo(() => `${getDayPeriod(new Date())}，${displayName}`, [displayName]);
  const dockHeight = 68;
  const dockSpacing = 24;
  const inputHeight = 64;
  const dockOffset = dockHeight + dockSpacing + insets.bottom;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const openArticle = useCallback(
    async (article: RelatedArticle) => {
      setActiveArticle(buildArticleFromRelated(article));
      setSheetVisible(true);
      setActiveDetail(null);
      try {
        const detail = await fetchArticleDetail(article.id, token);
        setActiveArticle(detail);
        setActiveDetail(detail);
      } catch {
        setActiveDetail(null);
      }
    },
    [token]
  );

  const closeArticle = useCallback(() => {
    setSheetVisible(false);
    setActiveArticle(null);
    setActiveDetail(null);
  }, []);

  const toggleSources = useCallback((id: string) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const sendChatMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isThinking) {
      return;
    }
    setInput('');
    scrollToEnd();
    void sendChat(question).finally(scrollToEnd);
  }, [input, isThinking, scrollToEnd, sendChat]);

  const renderMarkdownWithMermaid = useCallback((content: string) => {
    const segments: Array<{ type: 'markdown' | 'mermaid'; content: string }> = [];
    const regex = /```mermaid\s*([\s\S]*?)```/g;
    let lastIndex = 0;
    let match = regex.exec(content);
    while (match) {
      if (match.index > lastIndex) {
        segments.push({ type: 'markdown', content: content.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'mermaid', content: match[1].trim() });
      lastIndex = match.index + match[0].length;
      match = regex.exec(content);
    }
    if (lastIndex < content.length) {
      segments.push({ type: 'markdown', content: content.slice(lastIndex) });
    }
    return segments.map((segment, index) => {
      if (segment.type === 'mermaid') {
        if (!mermaidScript) {
          return (
            <Markdown key={`mermaid-fallback-${index}`} style={markdownStyles}>
              {` \n\`\`\`mermaid\n${segment.content}\n\`\`\`\n `}
            </Markdown>
          );
        }
        return (
          <View key={`mermaid-${index}`} style={styles.mermaidWrap}>
            <WebView
              originWhitelist={['*']}
              source={{ html: mermaidHtml(segment.content, mermaidScript) }}
              style={styles.mermaidWebview}
              scrollEnabled={false}
            />
          </View>
        );
      }
      return (
        <Markdown key={`md-${index}`} style={markdownStyles}>
          {segment.content || ' '}
        </Markdown>
      );
    });
  }, [mermaidScript]);

  return (
    <View style={styles.safeArea}>
      <AmbientBackground variant="explore" />
      <TopBar
        variant="explore"
        title="智能助理"
        dateText={formatDateLabel()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.chatContainer,
            { paddingBottom: dockOffset + inputHeight + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <View style={styles.emptyGlow} />
                <View style={styles.emptyIcon}>
                  <Crown size={28} color={colors.gold500} weight="fill" />
                </View>
              </View>
              <Text style={styles.emptyTitle}>{greeting}</Text>
              <Text style={styles.emptySub}>
                AI 助理随时为您待命。
              </Text>
            </View>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={styles.messageBlock}>
                <ChatMessageItem
                  message={msg}
                  renderMarkdown={renderMarkdownWithMermaid}
                />
                {!msg.isUser && msg.related && msg.related.length > 0 && (
                  <SourceList
                    related={msg.related}
                    highlights={msg.highlights || []}
                    expanded={!!expandedSources[msg.id]}
                    onToggle={() => toggleSources(msg.id)}
                    onOpenArticle={openArticle}
                  />
                )}
              </View>
            ))
          )}

          {isThinking && (
            <ThinkingIndicator />
          )}
        </ScrollView>

        <View style={{ paddingBottom: dockOffset }}>
          <ChatInput value={input} onChangeText={setInput} onSend={sendChatMessage} />
        </View>
      </KeyboardAvoidingView>

      <BottomDock
        activeTab="ai"
        onHome={() => router.push('/(tabs)')}
        onAi={() => undefined}
        onSettings={() => router.push('/(tabs)/settings')}
      />

      <ArticleDetailSheet
        visible={sheetVisible}
        article={activeArticle}
        detail={activeDetail}
        onClose={closeArticle}
      />
    </View>
  );
}

const markdownStyles = {
  body: {
    color: colors.stone700,
    fontSize: 14,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  strong: {
    color: colors.imperial600,
    fontWeight: '700',
  },
  link: {
    color: colors.gold500,
  },
  code_inline: {
    backgroundColor: colors.gold50,
    color: colors.stone800,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  chatContainer: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 140,
    gap: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 80,
  },
  emptyIconWrap: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlow: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 32,
    backgroundColor: colors.gold400,
    opacity: 0.15,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.gold500,
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 0px 16px rgba(184, 134, 11, 0.12)',
      },
    }),
  },
  emptyTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: colors.stone900,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 12,
    color: colors.stone400,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageBlock: {
    marginTop: 0,
  },
  mermaidWrap: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  mermaidWebview: {
    width: '100%',
    height: 240,
    backgroundColor: 'transparent',
  },
});

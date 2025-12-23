import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Asset } from 'expo-asset';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import {
  ArrowUp,
  Crown,
  Sparkle,
} from 'phosphor-react-native';

import { ArticleDetailSheet } from '@/components/article-detail-sheet';
import { BottomDock } from '@/components/bottom-dock';
import { colors } from '@/constants/palette';
import type { Article, ArticleDetail, RelatedArticle } from '@/types/article';

type ChatMessage = {
  id: string;
  isUser: boolean;
  text: string;
  highlights?: string[];
  related?: RelatedArticle[];
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
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

function getDayPeriod(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return '上午好';
  }
  if (hour >= 12 && hour < 18) {
    return '下午好';
  }
  return '晚上好';
}

function sanitizeText(text: string) {
  return text.replace(/[^\w\u4e00-\u9fff]+/g, ' ').trim();
}

function extractKeywords(question: string) {
  const cleaned = sanitizeText(question);
  if (!cleaned) {
    return [];
  }
  const tokens = cleaned.split(/\s+/).filter((token) => token.length >= 2);
  const unique = Array.from(new Set(tokens));
  unique.sort((a, b) => b.length - a.length);
  return unique.slice(0, 8);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text: string, highlights: string[]) {
  if (!text || highlights.length === 0) {
    return <Text style={styles.snippetText}>{text}</Text>;
  }
  const pattern = highlights.map(escapeRegex).join('|');
  if (!pattern) {
    return <Text style={styles.snippetText}>{text}</Text>;
  }
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return (
    <Text style={styles.snippetText}>
      {parts.map((part, index) => {
        const isMatch = regex.test(part);
        regex.lastIndex = 0;
        return (
          <Text key={`${part}-${index}`} style={isMatch ? styles.snippetHighlight : undefined}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

function buildSnippet(article: RelatedArticle) {
  return article.content_snippet || article.summary_snippet || '';
}

export default function AiAssistantScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('用户');
  const [mermaidScript, setMermaidScript] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [activeDetail, setActiveDetail] = useState<ArticleDetail | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync('access_token').then((value) => {
      if (mounted) {
        setToken(value);
      }
    });
    SecureStore.getItemAsync('user_profile').then((value) => {
      if (!mounted) {
        return;
      }
      try {
        const parsed = value ? JSON.parse(value) : {};
        setDisplayName(parsed?.display_name || parsed?.username || '用户');
      } catch {
        setDisplayName('用户');
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadMermaid = async () => {
      try {
        const asset = Asset.fromModule(require('../../assets/mermaid.min.txt'));
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

  const greeting = useMemo(() => `${getDayPeriod(new Date())}，${displayName}`, [displayName]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const openArticle = useCallback(
    async (article: RelatedArticle) => {
      setActiveArticle({
        id: article.id,
        title: article.title,
        unit: article.unit,
        published_on: article.published_on,
        summary: article.summary_snippet,
      });
      setSheetVisible(true);
      setActiveDetail(null);
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const resp = await fetch(`${apiBaseUrl}/articles/${article.id}`, { headers });
        if (!resp.ok) {
          return;
        }
        const detail = (await resp.json()) as ArticleDetail;
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

  const setMessageText = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  }, []);

  const updateRelated = useCallback((id: string, related: RelatedArticle[]) => {
    setMessages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, related } : item))
    );
  }, []);

  const toggleSources = useCallback((id: string) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const askOnce = useCallback(
    async (question: string) => {
      if (!token) {
        throw new Error('missing token');
      }
      const resp = await fetch(`${apiBaseUrl}/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question, top_k: 3 }),
      });
      if (!resp.ok) {
        throw new Error('ai ask failed');
      }
      return (await resp.json()) as {
        answer?: string;
        related_articles?: RelatedArticle[];
      };
    },
    [token]
  );

  const sendChat = useCallback(async () => {
    const question = input.trim();
    if (!question || isThinking) {
      return;
    }
    setInput('');
    const highlights = extractKeywords(question);
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      isUser: true,
      text: question,
    };
    const aiMessageId = `a-${Date.now()}`;
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      isUser: false,
      text: '',
      highlights,
    };
    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setIsThinking(true);
    scrollToEnd();

    try {
      const result = await askOnce(question);
      const answer = result.answer || '抱歉，当前服务不可用，请稍后再试。';
      setMessageText(aiMessageId, answer);
      if (result.related_articles?.length) {
        updateRelated(aiMessageId, result.related_articles);
      }
    } catch {
      setMessageText(aiMessageId, '抱歉，当前服务不可用，请稍后再试。');
    } finally {
      setIsThinking(false);
      scrollToEnd();
    }
  }, [askOnce, input, isThinking, scrollToEnd, setMessageText, updateRelated]);

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
      <View style={styles.ambientBg}>
        <View style={[styles.orb, styles.orbGold]} />
        <View style={[styles.orb, styles.orbRed]} />
        <View style={[styles.orb, styles.orbWarm]} />
      </View>

      <View style={styles.topBarWrap}>
        <BlurView intensity={60} tint="light" style={styles.topBarBlur}>
          <View style={styles.topBar}>
            <View>
              <View style={styles.dateRow}>
                <View style={styles.dateDot} />
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString('zh-CN', {
                    weekday: 'long',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={styles.pageTitle}>智能助理</Text>
            </View>
          </View>
        </BlurView>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatContainer}
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
              <View
                key={msg.id}
                style={[
                  styles.messageWrap,
                  msg.isUser ? styles.messageRight : styles.messageLeft,
                ]}
              >
                <Text style={styles.messageLabel}>
                  {msg.isUser ? 'ME' : 'AI ASSISTANT'}
                </Text>
                <View
                  style={[
                    styles.messageBubble,
                    msg.isUser ? styles.messageUser : styles.messageAi,
                  ]}
                >
                  {!msg.isUser && <View style={styles.aiLine} />}
                  {msg.isUser && <View style={styles.userLine} />}
                  {msg.isUser ? (
                    <Text style={styles.messageText}>{msg.text}</Text>
                  ) : (
                    renderMarkdownWithMermaid(msg.text || ' ')
                  )}
                </View>
                {!msg.isUser && msg.related && msg.related.length > 0 && (
                  <View style={styles.sourceWrap}>
                    <Pressable onPress={() => toggleSources(msg.id)} style={styles.sourceHeaderRow}>
                      <Text style={styles.sourceTitle}>引用材料</Text>
                      <Text style={styles.sourceToggle}>
                        {expandedSources[msg.id] ? '收起' : '展开'}
                      </Text>
                    </Pressable>
                    {expandedSources[msg.id] &&
                      msg.related.map((article) => (
                        <Pressable
                          key={`${msg.id}-${article.id}`}
                          style={styles.sourceCard}
                          onPress={() => openArticle(article)}
                        >
                          <View style={styles.sourceHeader}>
                            <Text style={styles.sourceTag}>{article.unit || '公告'}</Text>
                            <Text style={styles.sourceDate}>{article.published_on || '--'}</Text>
                          </View>
                          <Text style={styles.sourceTitleText}>{article.title}</Text>
                          {renderHighlightedText(buildSnippet(article), msg.highlights || [])}
                        </Pressable>
                      ))}
                  </View>
                )}
              </View>
            ))
          )}

          {isThinking && (
            <View style={styles.thinkingRow}>
              <View style={styles.thinkingBadge}>
                <Sparkle size={12} color={colors.gold500} weight="fill" />
              </View>
              <Text style={styles.thinkingText}>THINKING...</Text>
              <ActivityIndicator size="small" color={colors.gold500} />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputWrap}>
          <View style={styles.inputShell}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="输入指令..."
              placeholderTextColor={colors.stone400}
              style={styles.input}
              onSubmitEditing={sendChat}
              returnKeyType="send"
            />
            <Pressable style={styles.sendButton} onPress={sendChat}>
              <ArrowUp size={16} color={colors.white} weight="bold" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomDock
        activeTab="ai"
        onHome={() => router.push('/(tabs)')}
        onAi={() => undefined}
        onSettings={() => undefined}
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
  ambientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orbGold: {
    width: 320,
    height: 320,
    backgroundColor: colors.gold100,
    top: -60,
    left: -60,
  },
  orbRed: {
    width: 300,
    height: 300,
    backgroundColor: '#F9D7D7',
    bottom: -60,
    right: -30,
  },
  orbWarm: {
    width: 220,
    height: 220,
    backgroundColor: '#FDEED6',
    top: '45%',
    left: '50%',
    marginLeft: -110,
    marginTop: -110,
  },
  topBarWrap: {
    paddingTop: 44,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topBarBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  topBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold400,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.imperial600,
    textTransform: 'uppercase',
  },
  pageTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: colors.stone900,
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
    shadowColor: colors.gold500,
    shadowOpacity: 0.12,
    shadowRadius: 16,
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
  messageWrap: {
    gap: 8,
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.stone300,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  messageUser: {
    backgroundColor: colors.stone800,
    borderBottomRightRadius: 6,
  },
  messageAi: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    color: colors.gold50,
    fontSize: 14,
    lineHeight: 20,
  },
  aiLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: colors.gold400,
  },
  userLine: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    backgroundColor: colors.imperial600,
  },
  sourceWrap: {
    marginTop: 6,
    width: '100%',
    gap: 12,
  },
  sourceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.stone600,
  },
  sourceToggle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold500,
  },
  sourceCard: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone100,
    gap: 6,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.imperial600,
  },
  sourceDate: {
    fontSize: 10,
    color: colors.stone300,
  },
  sourceTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.stone800,
  },
  snippetText: {
    fontSize: 12,
    color: colors.stone500,
    lineHeight: 18,
  },
  snippetHighlight: {
    color: colors.imperial600,
    fontWeight: '700',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thinkingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.gold500,
  },
  inputWrap: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  inputShell: {
    borderRadius: 26,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  input: {
    paddingLeft: 16,
    paddingRight: 56,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.stone800,
  },
  sendButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.imperial600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.imperial600,
    shadowOpacity: 0.3,
    shadowRadius: 10,
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

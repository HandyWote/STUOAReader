// AI智能助理页面
// 主要功能：提供AI对话界面，支持Markdown消息渲染、Mermaid图表展示、相关文章查看

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, // 键盘避免视图，处理键盘弹出时的布局
  Platform, // 平台检测
  ScrollView, // 滚动视图
  StyleSheet, // 样式表
  Text, // 文本组件
  View, // 视图组件
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 安全区域钩子
import { useRouter } from 'expo-router'; // 路由导航
import Markdown from 'react-native-markdown-display'; // Markdown渲染组件
import { WebView } from 'react-native-webview'; // WebView组件，用于渲染Mermaid图表
import { Crown } from 'phosphor-react-native'; // 图标组件

import { AmbientBackground } from '@/components/ambient-background'; // 背景效果组件
import { ArticleDetailSheet } from '@/components/article-detail-sheet'; // 文章详情弹窗
import { BottomDock } from '@/components/bottom-dock'; // 底部导航栏
import { ChatInput } from '@/components/chat-input'; // 聊天输入组件
import { ChatMessageItem } from '@/components/chat-message'; // 聊天消息项
import { SourceList } from '@/components/source-list'; // 来源列表组件
import { ThinkingIndicator } from '@/components/thinking-indicator'; // AI思考指示器
import { TopBar } from '@/components/top-bar'; // 顶部栏组件
import { colors } from '@/constants/palette'; // 颜色常量
import { useAiChat } from '@/hooks/use-ai-chat'; // AI聊天钩子
import { useAuthToken } from '@/hooks/use-auth-token'; // 认证令牌钩子
import { useDisplayName } from '@/hooks/use-display-name'; // 显示名称钩子
import { useMermaidScript } from '@/hooks/use-mermaid'; // Mermaid脚本钩子
import { buildArticleFromRelated, fetchArticleDetail } from '@/services/articles'; // 文章服务
import { formatDateLabel, getDayPeriod } from '@/utils/date'; // 日期工具
import type { Article, ArticleDetail, RelatedArticle } from '@/types/article'; // 类型定义
// Mermaid图表HTML模板生成函数
// 参数：diagram - Mermaid图表代码，script - Mermaid库脚本
// 返回：完整的HTML字符串，用于在WebView中渲染Mermaid图表
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

// AI智能助理页面组件
export default function AiAssistantScreen() {
  // 路由实例，用于页面跳转
  const router = useRouter();
  // 滚动视图引用，用于控制滚动到顶部或底部
  const scrollRef = useRef<ScrollView>(null);
  // 用户输入的文本内容
  const [input, setInput] = useState('');
  // 当前激活的文章（用于详情弹窗）
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  // 当前激活文章的详细信息
  const [activeDetail, setActiveDetail] = useState<ArticleDetail | null>(null);
  // 文章详情弹窗的可见性状态
  const [sheetVisible, setSheetVisible] = useState(false);
  // 记录每个消息的来源列表展开状态
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  // 获取认证令牌
  const token = useAuthToken();
  // 获取用户显示名称（默认为"用户"）
  const displayName = useDisplayName('用户');
  // 获取Mermaid图表库的脚本
  const mermaidScript = useMermaidScript();
  // 使用AI聊天钩子，获取聊天消息列表、思考状态和发送消息函数
  const { messages, isThinking, sendChat } = useAiChat(token);
  // 获取安全区域信息（用于适配刘海屏等）
  const insets = useSafeAreaInsets();

  // 根据当前时间生成问候语（如"早上好，张三"）
  const greeting = useMemo(() => `${getDayPeriod(new Date())}，${displayName}`, [displayName]);
  // 底部导航栏高度
  const dockHeight = 68;
  // 底部导航栏与输入框之间的间距
  const dockSpacing = 24;
  // 输入框高度
  const inputHeight = 64;
  // 底部偏移量（为底部导航栏和输入框留出空间）
  const dockOffset = dockHeight + dockSpacing + insets.bottom;

  // 滚动到聊天消息列表底部的函数
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  // 打开文章详情的函数
  // 参数：article - 相关文章对象
  const openArticle = useCallback(
    async (article: RelatedArticle) => {
      // 先设置基本信息，显示弹窗
      setActiveArticle(buildArticleFromRelated(article));
      setSheetVisible(true);
      setActiveDetail(null);
      try {
        // 获取文章详情
        const detail = await fetchArticleDetail(article.id, token);
        setActiveArticle(detail);
        setActiveDetail(detail);
      } catch {
        // 失败时清空详情
        setActiveDetail(null);
      }
    },
    [token]
  );

  // 关闭文章详情的函数
  const closeArticle = useCallback(() => {
    setSheetVisible(false);
    setActiveArticle(null);
    setActiveDetail(null);
  }, []);

  // 切换来源列表展开/收起状态的函数
  // 参数：id - 消息ID
  const toggleSources = useCallback((id: string) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  // 发送聊天消息的函数
  const sendChatMessage = useCallback(async () => {
    const question = input.trim();
    // 验证输入是否为空或AI正在思考
    if (!question || isThinking) {
      return;
    }
    setInput('');
    scrollToEnd();
    // 发送消息，无论成功失败都滚动到底部
    void sendChat(question).finally(scrollToEnd);
  }, [input, isThinking, scrollToEnd, sendChat]);

  // 渲染带Mermaid图表的Markdown内容
  // 参数：content - Markdown文本内容
  // 返回：JSX元素数组，包含Markdown文本和Mermaid图表
  const renderMarkdownWithMermaid = useCallback((content: string) => {
    // 分割内容为markdown和mermaid片段
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
    // 渲染每个片段
    return segments.map((segment, index) => {
      if (segment.type === 'mermaid') {
        // 如果没有Mermaid脚本，回退到Markdown代码块显示
        if (!mermaidScript) {
          return (
            <Markdown key={`mermaid-fallback-${index}`} style={markdownStyles}>
              {` \n\`\`\`mermaid\n${segment.content}\n\`\`\`\n `}
            </Markdown>
          );
        }
        // 使用WebView渲染Mermaid图表
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
      // 渲染Markdown文本
      return (
        <Markdown key={`md-${index}`} style={markdownStyles}>
          {segment.content || ' '}
        </Markdown>
      );
    });
  }, [mermaidScript]);

  // 渲染页面
  return (
    <View style={styles.safeArea}>
      {/* 背景效果组件 */}
      <AmbientBackground variant="explore" />
      {/* 顶部栏：显示标题和日期 */}
      <TopBar
        variant="explore"
        title="智能助理"
        dateText={formatDateLabel()}
      />

      {/* 键盘避免视图：处理键盘弹出时的布局 */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* 滚动视图：显示聊天消息列表 */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.chatContainer,
            { paddingBottom: dockOffset + inputHeight + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        >
          {/* 空状态：无消息时显示问候 */}
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
            /* 消息列表：渲染每条聊天消息 */
            messages.map((msg) => (
              <View key={msg.id} style={styles.messageBlock}>
                {/* 聊天消息项 */}
                <ChatMessageItem
                  message={msg}
                  renderMarkdown={renderMarkdownWithMermaid}
                />
                {/* AI回复的相关文章来源列表 */}
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

          {/* AI思考指示器 */}
          {isThinking && (
            <ThinkingIndicator />
          )}
        </ScrollView>

        {/* 聊天输入框容器 */}
        <View style={{ paddingBottom: dockOffset }}>
          <ChatInput value={input} onChangeText={setInput} onSend={sendChatMessage} />
        </View>
      </KeyboardAvoidingView>

      {/* 底部导航栏 */}
      <BottomDock
        activeTab="ai"
        onHome={() => router.push('/(tabs)')}
        onAi={() => undefined}
        onSettings={() => router.push('/(tabs)/settings')}
      />

      {/* 文章详情弹窗 */}
      <ArticleDetailSheet
        visible={sheetVisible}
        article={activeArticle}
        detail={activeDetail}
        onClose={closeArticle}
      />
    </View>
  );
}

// Markdown样式配置
const markdownStyles = {
  body: {
    color: colors.stone700, // 文本颜色
    fontSize: 14, // 字体大小
    lineHeight: 22, // 行高
  },
  paragraph: {
    marginTop: 0, // 段落顶部间距
    marginBottom: 8, // 段落底部间距
  },
  strong: {
    color: colors.imperial600, // 加粗文本颜色
    fontWeight: '700', // 加粗字体
  },
  link: {
    color: colors.gold500, // 链接颜色
  },
  code_inline: {
    backgroundColor: colors.gold50, // 行内代码背景色
    color: colors.stone800, // 行内代码文字颜色
    paddingHorizontal: 6, // 行内代码水平内边距
    paddingVertical: 2, // 行内代码垂直内边距
    borderRadius: 6, // 行内代码圆角
  },
};

// 页面样式定义
const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // 占满整个屏幕
    backgroundColor: colors.surface, // 背景颜色
  },
  flex: {
    flex: 1, // 占满可用空间
  },
  chatContainer: {
    flexGrow: 1, // 填充容器空间
    paddingHorizontal: 18, // 左右内边距
    paddingTop: 10, // 顶部内边距
    paddingBottom: 140, // 底部内边距
    gap: 20, // 子元素间距
  },
  emptyState: {
    flex: 1, // 占满空间
    alignItems: 'center', // 水平居中
    justifyContent: 'center', // 垂直居中
    paddingTop: 80, // 顶部内边距
    paddingBottom: 80, // 底部内边距
  },
  emptyIconWrap: {
    width: 86, // 宽度
    height: 86, // 高度
    alignItems: 'center', // 水平居中
    justifyContent: 'center', // 垂直居中
  },
  emptyGlow: {
    position: 'absolute', // 绝对定位
    width: 86, // 宽度
    height: 86, // 高度
    borderRadius: 32, // 圆角
    backgroundColor: colors.gold400, // 光晕颜色
    opacity: 0.15, // 透明度
  },
  emptyIcon: {
    width: 72, // 宽度
    height: 72, // 高度
    borderRadius: 26, // 圆角
    backgroundColor: colors.white, // 背景色
    alignItems: 'center', // 水平居中
    justifyContent: 'center', // 垂直居中
    ...Platform.select({
      ios: {
        shadowColor: colors.gold500, // 阴影颜色
        shadowOpacity: 0.12, // 阴影透明度
        shadowRadius: 16, // 阴影半径
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
    marginTop: 18, // 顶部外边距
    fontSize: 18, // 字体大小
    fontWeight: '700', // 字体粗细
    color: colors.stone900, // 文字颜色
  },
  emptySub: {
    marginTop: 8, // 顶部外边距
    fontSize: 12, // 字体大小
    color: colors.stone400, // 文字颜色
    textAlign: 'center', // 文本居中
    lineHeight: 18, // 行高
  },
  messageBlock: {
    marginTop: 0, // 顶部外边距
  },
  mermaidWrap: {
    marginVertical: 8, // 上下外边距
    borderRadius: 16, // 圆角
    overflow: 'hidden', // 裁剪超出内容
    backgroundColor: colors.white, // 背景色
  },
  mermaidWebview: {
    width: '100%', // 宽度占满
    height: 240, // 固定高度
    backgroundColor: 'transparent', // 透明背景
  },
});

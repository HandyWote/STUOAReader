# 开发计划（后端 / 爬虫 / APP）

## 概览
- 目标：用增量爬虫 + 后端 API + Expo RN APP 实现 OA 当日文章的抓取、摘要、通知和问答。
- 调度：每天 07:00–24:00 每小时执行一次；`--date` 可补抓历史。
- 数据流：爬虫抓当日 → AI 摘要 → 入库（文章+附件元数据+当日向量）→ 后端 API 提供增量查询/问答 → APP 轮询 + 本地通知。

## 后端（Flask + Postgres + Redis）
1) **数据模型**
   - 文章表：`id, title, unit, link (unique), published_on, content, summary, attachments (jsonb), created_at, updated_at`.
   - 向量表：`id, article_id, embedding, published_on, created_at`（仅当日用于问答）。
   - 用户表：`id, username, display_name, password_hash, password_algo, password_cost, roles, created_at, updated_at`.
2) **API**
   - 鉴权：`POST /auth/token`（用户名/密码登录，校园认证校验）、`POST /auth/token/refresh`.
   - 文章：`GET /articles?date=YYYY-MM-DD&since=ts`（增量列表，含附件元数据、ETag/Last-Modified 支持 304）；`GET /articles/:id`。
   - AI：`POST /ai/ask`（官方模型，向量检索范围由后端配置控制：`AI_VECTOR_LIMIT_DAYS`/`AI_VECTOR_LIMIT_COUNT`）。
   - 通知测试：可选 `/notifications/test`。
   - 阅读状态接口：不做（由客户端本地维护）。
3) **缓存与优化**
   - Redis 缓存最新列表摘要，配合 `If-None-Match/If-Modified-Since` 返回 304。
   - Redis 仅缓存最近 5 天文章列表。
   - 限流与日志：按用户/IP 速率限制，记录 AI 调用/爬虫写入（结构化日志可后续完善）。
4) **安全/运维**
   - HTTPS、JWT 过期/刷新、CORS。
   - 监控：爬虫成功率、接口延迟、轮询量、AI 调用量（后续计划）。

## 爬虫（Python） ✅ 已完成
1) **调度**
   - 每小时运行；限定 07:00–24:00，其他时间不跑。参数化 `--date` 支持补抓。
2) **列表与增量**
   - 仅处理目标日（默认当天）发布日期的条目，不 break，全量扫描当天列表。
   - 去重：查数据库当日已存在 `link` 集合，存在则跳过，不再拉详情/摘要。
3) **详情解析**
   - 抽取正文、标题、发布单位、发布日期、链接。
   - 解析附件名称+下载 URL，保存到 `attachments` 字段（不下载），正文中追加附件信息。
4) **AI 摘要**
   - 首轮对新增条目全部调用；失败收集后统一重试（最多 3 轮）。仍失败写占位摘要并记日志。
5) **入库与向量**
   - 新文章写文章表；为当日内容生成向量写向量表（仅当日供问答），使用 OpenAI 兼容 embedding 接口，pgvector 默认 1024 维。
6) **日志与指标**
   - 每轮打印列表条数/新增数/AI 成功/AI 重试后失败/向量写入数/耗时。

## APP（Expo React Native）
1) **基础栈**
   - `expo-router`, `@tanstack/react-query`（持久化 mmkv）, `axios`, `react-native-mmkv`, `expo-secure-store`, `expo-file-system`, `expo-notifications`, `expo-background-fetch`, `expo-task-manager`.
2) **鉴权**
   - 登录页采用账号/密码输入表单（替代“开启今日阅读”CTA），后端签发 JWT；secure-store 保存 access/refresh，拦截器自动刷新。
3) **数据与缓存**
   - 列表/详情通过后端 API；react-query 持久化；正文/附件元数据缓存到本地（附件不下载）。
   - 未读状态：由客户端本地维护（后端不记录已读）。
4) **轮询与通知**
   - 后台轮询（默认 1 小时，可在 07:00–24:00 生效），`/articles?since=ts` 增量获取；发现新文章触发本地通知 + 红点/角标。
   - 前台可短轮询/下拉刷新；弱网离线可看缓存。
5) **AI 问答**
   - 官方模式：调用后端 `/ai/ask`，向量检索范围由后端配置控制（按条数或天数）。
6) **AI 助手（问答 + 引用材料）**
   - 接口：使用 `POST /ai/ask` 获取非流式回答。
   - 引用材料：默认折叠；展示标题 + 片段（正文优先，80 字）；点击进入文章详情（复用详情弹层）。
   - 关键词高亮：前端从用户问题提取关键词并在片段中高亮（不引入分词库）。
   - Markdown + Mermaid：前端渲染 Markdown；遇到 ```mermaid``` 片段用 WebView 渲染。
   - 用户称呼：基于登录返回的 `display_name/username` + 本地时间段（上午/下午/晚上）。
   - UI：严格对齐 `OAP-app/原型.html` 的 AI 助手区块（排版、色彩、间距、动效）。
6) **体验**
   - 通知开关/静音时段、轮询间隔（受系统最小值限制）。
   - 列表搜索/筛选可后续迭代。
7) **个人中心展示**
   - 仅展示头像、姓名与 VIP 标识（不显示部门信息）。

## 重构方案（基于现有爬虫升级）

### 模块划分
1. **爬虫模块** (`spider/`)
   - `CrawlerScheduler`: 调度器（07:00–24:00 每小时执行）
   - `OACrawler`: 增量爬虫（去重、附件解析）
   - `AttachmentParser`: 附件 DOM 解析
   - `IncrementalTracker`: 增量跟踪

2. **数据存储模块** (`storage/`)
   - `DatabaseManager`: PostgreSQL 操作（文章、向量、阅读状态、用户）
   - `RedisCache`: 缓存最新列表（ETag/Last-Modified）
   - `VectorStore`: 向量生成与检索（pgvector）

3. **后端 API 模块** (`backend/`)
   - Flask 应用，包含认证、文章、AI、通知蓝图
   - JWT 认证、限流、CORS、结构化日志

4. **AI 服务模块** (`ai/`)
   - `Summarizer`: 摘要生成（重试机制）
   - `EmbeddingGenerator`: 向量生成（OpenAI/本地）
   - `AIService`: 问答服务（官方+代理模式）

5. **监控模块** (`monitoring/`)
   - 爬虫成功率、接口延迟、轮询量、AI 调用量
   - JSON 结构化日志

### 数据流
调度器触发 → 爬虫抓取当日列表 → 去重检查 → 解析详情+附件 → AI 摘要生成 → 入库文章表 → 生成向量 → 更新缓存 → 后端 API 提供服务 → APP 轮询增量 → 触发本地通知。

### 增量抓取逻辑
1. 每小时运行（07:00–24:00），`--date` 参数支持补抓
2. 全量扫描当天列表，过滤出目标日期的条目
3. 去重：查询数据库当日已存在的 `link` 集合，跳过已处理条目
4. 解析附件元数据（不下载文件）
5. AI 摘要生成：首轮全量调用，失败重试最多 3 轮
6. 入库文章表，生成向量（仅当日），更新 Redis 缓存

### AI 摘要与向量化
- **摘要生成**: 使用配置的 AI 模型（如 GLM-4.5-flash），重试机制保障可靠性
- **向量生成**: 使用 OpenAI 或本地 embedding 模型，存储为 pgvector 格式
- **问答服务**: 基于当日向量的相似性检索，提供官方和代理两种模式

### 路线图与时间估算
1. **阶段 1: 基础数据库与爬虫重构** (3 天) – 建立数据库，实现增量爬虫
2. **阶段 2: 后端 API 开发** (4 天) – 实现 Flask API 和认证
3. **阶段 3: AI 向量化与问答** (3 天) – 向量生成和问答端点
4. **阶段 4: 调度与监控** (2 天) – 调度器和监控集成
5. **阶段 5: 联调与测试** (2 天) – 端到端测试和优化

**总时间**: 约 14 个工作日（2.5 周）

### 技术栈
- **语言**: Python 3.10+
- **数据库**: PostgreSQL + pgvector
- **缓存**: Redis
- **后端**: Flask, SQLAlchemy, JWT
- **爬虫**: requests, BeautifulSoup, schedule
- **AI**: OpenAI API / 智谱 GLM / sentence-transformers
- **部署**: Docker, Docker Compose

### 风险与缓解
- OA 网站结构变更：可配置解析规则
- AI 服务不可用：降级为占位摘要
- 性能瓶颈：数据库索引、查询优化、缓存策略
- 安全性：输入验证、SQL 注入防护、API 密钥管理

## 未决/确认点
- 附件 DOM 解析规则你会提供；实现时按规则提取名称/URL。
- ETag/Last-Modified 需后端与客户端配合（支持 304）；若用 `since` 增量可简化但建议保留 304。
- 上线前联调：登录、增量拉取、通知跳转、AI 两种模式、离线/弱网测试。***

## 当前后端差距清单（对照本计划）
以下问题来自对现有 `backend/` 的初步核对，用于后续逐项对齐实现：
1. 认证口径已确认：采用 `/api/auth/token`、`/api/auth/token/refresh` 的用户名/密码登录 + 校园认证校验方案。
2. 文章增量接口缺失：现有 `start_date/end_date/limit/offset` 与 `latest/by-date`，计划要求 `/articles?date=YYYY-MM-DD&since=ts`。
3. 阅读状态接口：不做（由客户端本地维护未读/已读）。
4. AI 代理模式：不做（统一使用后端配置的模型 Key）。
5. 问答向量过滤需调整：由“仅当日”改为“按条数或天数”控制，参数化在后端环境配置（`AI_VECTOR_LIMIT_DAYS`/`AI_VECTOR_LIMIT_COUNT`）。
6. 304 缓存口径需细化：已有 ETag，`Last-Modified` 以列表范围内 `MAX(created_at)` 为准，`If-Modified-Since` 对比后决定 304。
7. 通知测试端点：可选，当前不在优先级。
8. 监控与结构化日志：延后到未来计划。

## 未来计划
- 监控与结构化日志：补充指标采集与结构化日志输出。

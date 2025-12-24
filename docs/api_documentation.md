# OAP 后端 API 文档（当前实现）

## 概述

本文档描述 **当前已实现** 的后端 API 与行为约定，并标注已弃用/未实现部分。
当前能力包含：账号密码登录（含校园认证校验）、文章增量查询、向量问答。

## 技术栈

- **框架**: Flask 3.0.0+
- **数据库**: PostgreSQL（支持 pgvector）
- **缓存**: Redis
- **认证**: JWT
- **限流**: Flask-Limiter（默认：100/day, 20/hour）
- **CORS**: Flask-CORS

## 基本信息

### 基础 URL

生产环境：`oap-backend.handywote.top/api`（协议以部署为准）
开发环境：`http://localhost:4420/api`

### 认证

- `POST /auth/token`：用户名/密码登录（后端进行校园认证校验）
- `POST /auth/token/refresh`：刷新 JWT
- `POST /auth/logout`：登出（刷新令牌失效）
- `GET /auth/me`：获取当前用户信息
- 请求头：`Authorization: Bearer <access_token>`
- 说明：文章接口当前未强制鉴权；AI 接口要求鉴权

### 缓存

- 文章列表支持 `ETag/Last-Modified`，客户端使用 `If-None-Match/If-Modified-Since` 获取 304。
- 文章详情支持 `ETag`（无 `Last-Modified`）。

### 响应格式

错误响应：

```json
{
  "error": "错误描述"
}
```

成功响应：按端点返回业务字段（不额外包裹 `status`）。

## API 端点

### 1. 认证模块

#### 1.1 用户名/密码登录

```
POST /auth/token
```

**请求体**:

```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**响应**:

```json
{
  "access_token": "jwt_access",
  "refresh_token": "jwt_refresh",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "username": "username",
    "display_name": "用户名称",
    "roles": []
  }
}
```

#### 1.2 刷新访问令牌

```
POST /auth/token/refresh
```

**请求体**:

```json
{
  "refresh_token": "jwt_refresh"
}
```

**响应**:

```json
{
  "access_token": "jwt_access",
  "refresh_token": "jwt_refresh",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "username": "username",
    "display_name": "用户名称",
    "roles": []
  }
}
```

#### 1.3 登出

```
POST /auth/logout
```

**请求体**:

```json
{
  "refresh_token": "jwt_refresh"
}
```

**响应**:

```json
{
  "message": "已登出"
}
```

#### 1.4 获取当前用户信息

```
GET /auth/me
```

**响应**:

```json
{
  "user_id": "uuid",
  "display_name": "用户名称",
  "roles": []
}
```

### 2. 文章模块

#### 2.1 获取增量文章列表

```
GET /articles?date=YYYY-MM-DD&since=ts
```

**查询参数**:
- `date`: 指定日期（默认当天）
- `since`: 增量时间戳（可选，秒或毫秒）

**响应**:

```json
{
  "articles": [
    {
      "id": 1,
      "title": "文章标题",
      "unit": "发布单位",
      "link": "文章链接",
      "published_on": "2023-06-15",
      "summary": "文章摘要",
      "attachments": [
        {
          "name": "附件名称",
          "url": "附件链接"
        }
      ],
      "created_at": "2023-06-15T10:00:00",
      "updated_at": "2023-06-15T10:00:00"
    }
  ]
}
```

#### 2.2 获取文章详情

```
GET /articles/{article_id}
```

**响应**:

```json
{
  "id": 1,
  "title": "文章标题",
  "unit": "发布单位",
  "link": "文章链接",
  "published_on": "2023-06-15",
  "content": "文章内容",
  "summary": "文章摘要",
  "attachments": [],
  "created_at": "2023-06-15T10:00:00",
  "updated_at": "2023-06-15T10:00:00"
}
```

#### 2.3 获取最新文章

```
GET /articles/latest?count=10
```

**查询参数**:
- `count`: 返回数量（默认 10）

#### 2.4 获取指定日期文章

```
GET /articles/by-date/YYYY-MM-DD
```

### 3. AI 问答模块

#### 3.1 官方模式问答（按配置限制向量范围）

```
POST /ai/ask
```

**请求体**:

```json
{
  "question": "你的问题",
  "top_k": 3
}
```

**响应**:

```json
{
  "answer": "AI生成的回答",
  "related_articles": [
    {
      "id": 1,
      "title": "相关文章标题",
      "unit": "发布单位",
      "published_on": "2023-06-15",
      "similarity": 0.95,
      "content_snippet": "正文片段",
      "summary_snippet": "摘要片段"
    }
  ]
}
```

#### 3.2 生成向量嵌入

```
POST /ai/embed
```

**请求体**:

```json
{
  "text": "要生成嵌入的文本"
}
```

**响应**:

```json
{
  "embedding": []
}
```

## 已完成 / 已弃用 / 未实现

### 已完成
- 认证：`/auth/token`、`/auth/token/refresh`、`/auth/logout`、`/auth/me`
- 文章：`/articles/`、`/articles/<id>`、`/articles/latest`、`/articles/by-date/<date>`
- AI：`/ai/ask`、`/ai/embed`
- 缓存：列表 `ETag/Last-Modified`，详情 `ETag`

### 已弃用（不再实现）
- SSO token 换 JWT（原 `/auth/login`）
- 代理模式问答（`/ai/ask/proxy`）
- 阅读状态同步（`/articles/read`）
- 通知测试（`/notifications/test`）

## 错误码

| 状态码 | 描述 |
|--------|------|
| 200 | 成功 |
| 304 | 资源未修改 |
| 400 | 请求参数错误 |
| 401 | 未授权访问 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 部署与配置

### 环境变量

**核心配置**：
- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `AUTH_REFRESH_HASH_KEY`

**AI/Embedding（AI 问答使用）**：
- `AI_BASE_URL`
- `AI_MODEL`
- `API_KEY`
- `EMBED_BASE_URL`
- `EMBED_MODEL`
- `EMBED_API_KEY`
- `EMBED_DIM`（默认 1024）

**可选**：
- `REDIS_HOST`/`REDIS_PORT`/`REDIS_DB`/`REDIS_PASSWORD`
- `AI_VECTOR_LIMIT_DAYS`
- `AI_VECTOR_LIMIT_COUNT`

### 依赖安装（后端）

```bash
uv sync
```

### 启动服务

以实际后端入口为准，`backend/app.py` 默认端口为 4420。

## 开发与测试

### 运行测试

```bash
uv run pytest
```

### 代码风格检查

```bash
uv run ruff check .
```

# OAP 后端 API 文档（以开发计划为准）

## 概述

本文档描述 OAP 后端 API 的**规划接口**与行为约定，以 `docs/development_plan.md` 为主口径。
目标能力包含：SSO 登录换取 JWT、文章增量查询、阅读状态同步、当日向量问答，以及代理模式的 AI 透传。

> 说明：当前实现可能与本接口存在差异，后续以开发计划为准统一调整。

## 技术栈

- **框架**: Flask 3.0.0+
- **数据库**: PostgreSQL（支持 pgvector）
- **缓存**: Redis
- **认证**: JWT
- **限流**: Flask-Limiter（计划）
- **CORS**: Flask-CORS（计划）

## 基本信息

### 基础 URL

开发环境：`http://localhost:5000/api/`

### 认证

- `POST /auth/login`：SSO 交换 JWT
- `POST /auth/refresh`：刷新 JWT
- 请求头：`Authorization: Bearer <access_token>`

### 缓存

- 文章列表支持 `ETag/Last-Modified`，客户端使用 `If-None-Match/If-Modified-Since` 获取 304。

### 响应格式

成功响应：

```json
{
  "status": "success",
  "data": {}
}
```

错误响应：

```json
{
  "error": "错误描述"
}
```

## API 端点

### 1. 认证模块

#### 1.1 SSO 登录换取 JWT

```
POST /auth/login
```

**请求体**:

```json
{
  "sso_token": "your_sso_token"
}
```

**响应**:

```json
{
  "access_token": "jwt_access",
  "refresh_token": "jwt_refresh",
  "expires_in": 1800
}
```

#### 1.2 刷新访问令牌

```
POST /auth/refresh
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
  "expires_in": 1800
}
```

### 2. 文章模块

#### 2.1 获取增量文章列表

```
GET /articles?date=YYYY-MM-DD&since=ts
```

**查询参数**:
- `date`: 指定日期（默认当天）
- `since`: 增量时间戳（可选）

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

#### 2.3 批量标记已读

```
POST /articles/read
```

**请求体**:

```json
{
  "article_ids": [1, 2, 3]
}
```

**响应**:

```json
{
  "status": "success"
}
```

### 3. AI 问答模块

#### 3.1 官方模式问答（仅当日向量）

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
      "similarity": 0.95
    }
  ]
}
```

#### 3.2 代理模式问答（透传用户模型）

```
POST /ai/ask/proxy
```

**请求体**:

```json
{
  "question": "你的问题",
  "top_k": 3,
  "base_url": "https://api.example.com",
  "api_key": "user_api_key",
  "model": "model_name"
}
```

**响应**:

```json
{
  "answer": "AI生成的回答",
  "related_articles": []
}
```

### 4. 通知测试（可选）

```
POST /notifications/test
```

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

**必填（来自开发计划）**：
- `DATABASE_URL`
- `API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`
- `EMBED_BASE_URL`
- `EMBED_MODEL`
- `EMBED_API_KEY`
- `EMBED_DIM`（默认 1024）

**后端运行建议**：
- `SECRET_KEY`（JWT 签名）
- `REDIS_HOST`/`REDIS_PORT`/`REDIS_DB`/`REDIS_PASSWORD`

### 依赖安装

```bash
uv sync
```

### 启动服务

请以实际后端入口为准（当前文档不绑定具体启动命令）。

## 开发与测试

### 运行测试

```bash
uv run pytest
```

### 代码风格检查

```bash
uv run ruff check .
```

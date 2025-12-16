# OAP 后端 API 文档

## 概述

OAP (OA System Notification Crawler and Push) 后端 API 提供了用户认证、文章管理和基于向量的AI问答等功能。API采用RESTful设计风格，使用JWT进行认证，Redis缓存提升性能。

## 技术栈

- **框架**: Flask 3.0.0+
- **数据库**: PostgreSQL (支持pgvector向量扩展)
- **缓存**: Redis
- **认证**: JWT (JSON Web Token)
- **CORS**: Flask-CORS
- **限流**: Flask-Limiter

## 基本信息

### 基础URL

开发环境: `http://localhost:5000/api/`

### 认证

大部分API端点需要认证，使用JWT令牌。认证流程如下：
1. 调用 `/auth/token` 获取令牌
2. 在请求头中添加 `Authorization: Bearer <your_token>`

### 缓存

API实现了Redis缓存机制，支持304 Not Modified响应，通过ETag和If-None-Match头实现。

### 响应格式

所有API响应均为JSON格式：

```json
{
  "status": "success",
  "data": {...}
}
```

错误响应：

```json
{
  "error": "错误描述"
}
```

## API端点

### 1. 认证模块

#### 1.1 获取访问令牌

```
POST /auth/token
```

**请求体**:

SSO令牌方式：
```json
{
  "sso_token": "your_sso_token"
}
```

用户名密码方式：
```json
{
  "username": "test",
  "password": "password"
}
```

**响应**:

```json
{
  "access_token": "your_jwt_token",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### 1.2 获取当前用户信息

```
GET /auth/me
```

**响应**:

```json
{
  "sub": "user123",
  "username": "test_user"
}
```

### 2. 文章模块

#### 2.1 获取文章列表

```
GET /articles/
```

**查询参数**:
- `start_date`: 开始日期 (格式: YYYY-MM-DD，可选)
- `end_date`: 结束日期 (格式: YYYY-MM-DD，可选)
- `limit`: 返回的最大文章数 (默认: 20，可选)
- `offset`: 分页偏移量 (默认: 0，可选)

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
      "created_at": "2023-06-15T10:00:00"
    },
    // 更多文章...
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

#### 2.2 获取文章详情

```
GET /articles/{article_id}
```

**参数**:
- `article_id`: 文章ID

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
GET /articles/latest
```

**查询参数**:
- `count`: 返回的文章数 (默认: 10，可选)

**响应**:

```json
{
  "articles": [
    {
      "id": 1,
      "title": "最新文章标题",
      "unit": "发布单位",
      "link": "文章链接",
      "published_on": "2023-06-15",
      "summary": "文章摘要",
      "created_at": "2023-06-15T10:00:00"
    },
    // 更多文章...
  ]
}
```

#### 2.4 获取指定日期文章

```
GET /articles/by-date/{date_str}
```

**参数**:
- `date_str`: 发布日期 (格式: YYYY-MM-DD)

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
      "created_at": "2023-06-15T10:00:00"
    },
    // 更多文章...
  ]
}
```

### 3. AI问答模块

#### 3.1 基于向量的问答

```
POST /ai/ask
```

**请求体**:

```json
{
  "question": "你的问题",
  "top_k": 3  // 可选，返回的最大相关文章数
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
    },
    // 更多相关文章...
  ]
}
```

#### 3.2 生成文本向量嵌入

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
  "embedding": [0.1, 0.2, 0.3, ...]
}
```

### 4. 健康检查

```
GET /health
```

**响应**:

```json
{
  "status": "ok",
  "service": "oa-api",
  "version": "0.1.0"
}
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

- `SECRET_KEY`: JWT签名密钥
- `REDIS_HOST`: Redis服务器地址 (默认: localhost)
- `REDIS_PORT`: Redis端口 (默认: 6379)
- `REDIS_DB`: Redis数据库编号 (默认: 0)
- `REDIS_PASSWORD`: Redis密码 (默认: None)
- `DATABASE_URL`: PostgreSQL连接URL
- `API_KEY`: AI服务API密钥
- `AI_BASE_URL`: AI服务基础URL
- `AI_MODEL`: AI模型名称
- `EMBED_BASE_URL`: 嵌入服务基础URL
- `EMBED_MODEL`: 嵌入模型名称
- `EMBED_API_KEY`: 嵌入服务API密钥

### 依赖安装

```bash
uv install
```

### 启动服务

```bash
uv run python -m api.app
```

## 开发与测试

### 运行测试

```bash
uv run pytest
```

### 代码风格检查

```bash
uv run ruff check .
```

## 版本历史

- v0.1.0: 初始版本，实现核心功能
  - 用户认证系统
  - 文章管理API
  - AI问答API
  - Redis缓存集成
  - CORS和限流配置

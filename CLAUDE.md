# CLAUDE.md

## TOP RULES
- 沟通机制：回复必须使用中文。对于非纯文本修改的任务，必须优先提供设计方案，待我确认后方可编写代码。
- 复用原则：严格优先使用项目现有的组件、工具类和架构模式。
    - 注意：由于你可能无法读取全量代码，如果你推测可能存在相关组件但不确定位置，请先询问我，而不是直接制造重复轮子。
- 代码质量与兼容性：在重构或修改功能时，若发现兼容性冲突：
    - 首选策略：暴露问题，提出彻底的改进方案（不妥协）。
    - 备选策略：如果彻底改进影响范围过大（超过5个文件或涉及核心底层），请同时提供一个兼容方案（如适配器模式），并说明两者的利弊，由我决策。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OAP (Office Automation Platform) is a three-tier system that crawls, processes, and serves university OA notifications through a mobile app. It consists of:

1. **Crawler** (`crawler/`): Python-based incremental crawler that fetches articles, generates AI summaries, and creates embeddings
2. **Backend** (`backend/`): Flask REST API with JWT auth, Redis caching, and AI Q&A capabilities
3. **Mobile App** (`OAP-app/`): Expo React Native app with background polling and local notifications

**Key Architecture Principles:**
- Incremental crawling: Crawls daily articles every hour (07:00-24:00), stores only new items
- Vector-based Q&A: Uses pgvector for semantic search over configurable time windows
- Campus SSO integration: Backend validates credentials against campus authentication system
- Redis caching: Implements ETag/Last-Modified for 304 responses on article lists
- Client-side state: Read/unread status maintained locally in app, not on backend

## Database Architecture

**PostgreSQL with pgvector extension**

Tables:
- `articles`: Main article storage with `link` as unique constraint for deduplication
  - Fields: `id, title, unit, link (unique), published_on, content, summary, attachments (jsonb), created_at, updated_at`
- `embeddings`: Vector embeddings for semantic search, indexed by `published_on` for time-based filtering
  - Fields: `id, article_id, embedding (vector), published_on, created_at`
- `users`: Authentication with bcrypt password hashing
  - Fields: `id, username, display_name, password_hash, password_algo, password_cost, roles, created_at, updated_at`

**Critical Database Details:**
- Embeddings are only generated for articles on the target date (not historical)
- Vector search is constrained by `AI_VECTOR_LIMIT_DAYS` or `AI_VECTOR_LIMIT_COUNT` (backend config)
- Article deduplication uses `link` field - crawler queries existing links before fetching details

## Development Commands

### Crawler
```bash
# From project root or crawler/
cd crawler/

# Run for current date
python -m crawler.main

# Run for specific date (historical backfill)
python -m crawler.main --date 2025-01-15

# Install dependencies
pip install -e .  # or uv pip install -e .
```

**Crawler Configuration:**
- Config file: `crawler/env` (see `crawler/env.example`)
- Required: `DATABASE_URL`, `API_KEY`, `EMBED_BASE_URL`, `EMBED_API_KEY`, `REDIS_HOST`
- The crawler runs hourly in production (07:00-24:00 window)

### Backend
```bash
# From project root or backend/
cd backend/

# Development server
python -m backend.app
# Or directly:
python app.py

# Docker Compose
docker-compose up

# Install dependencies
pip install -e .  # or uv pip install -e .
```

**Backend Configuration:**
- Config file: `backend/.env` (see `backend/env.example`)
- Required: `DATABASE_URL`, `AUTH_JWT_SECRET`, `AUTH_REFRESH_HASH_KEY`
- Optional but recommended: Redis for caching, AI/embedding configs for Q&A endpoint

**Backend runs on port 5000** with the following blueprint structure:
- `/api/auth` - Authentication endpoints (login, refresh)
- `/api/articles` - Article listing and details
- `/api/ai` - AI question answering endpoint

### Mobile App
```bash
# From OAP-app/
cd OAP-app/

# Start development server
npm start
# Or with specific platform:
npm run android
npm run ios
npm run web

# Linting
npm run lint

# Install dependencies
npm install
# Or with bun:
bun install
```

**Mobile App Stack:**
- Expo Router for navigation
- expo-secure-store for JWT storage
- Background fetch not yet implemented (planned)
- Uses Markdown rendering for article content

## Configuration Management

**Both crawler and backend use a unified Config class pattern:**
1. Default values set in `__init__`
2. Load from env file (`.env` or `env`)
3. Override with environment variables (highest priority)

**Configuration Priority:** Environment variables > env file > defaults

**Key Config Differences:**
- Crawler config (`crawler/config.py`): Includes SMTP settings for email notifications (legacy)
- Backend config (`backend/config.py`): Includes AUTH, CORS, and campus SSO settings

**Environment Files:**
- Backend: `backend/.env` (never commit)
- Crawler: `crawler/env` (never commit)
- Templates: `*/env.example` (commit these)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/token` - Login with username/password (validates against campus SSO if enabled)
  - Returns: `access_token`, `refresh_token`, `user` object
- `POST /api/auth/token/refresh` - Refresh access token using refresh token

### Articles (`/api/articles`)
- Query params support ETag/Last-Modified for 304 responses
- See development plan for full endpoint specification (needs alignment with `?date=YYYY-MM-DD&since=ts` pattern)

### AI (`/api/ai`)
- `POST /api/ai/ask` - Question answering over article embeddings
  - Vector search window controlled by backend config: `AI_VECTOR_LIMIT_DAYS` or `AI_VECTOR_LIMIT_COUNT`
  - Backend-only mode (no "proxy mode" - all AI calls use backend-configured keys)

## Critical Implementation Details

### Crawler Pipeline Flow
1. Parse target date from CLI args (defaults to today)
2. Fetch article list page from OA system
3. Filter articles by `published_on == target_date`
4. Query database for existing article links on target date (deduplication)
5. For new articles only:
   - Fetch article detail page
   - Parse content, attachments (metadata only - not downloaded)
   - Generate AI summary (retry up to 3 times on failure)
   - Store article in database
   - Generate embedding and store in embeddings table
6. Update Redis cache to invalidate stale article lists

**Attachment Handling:**
- Attachments are parsed into JSON metadata: `[{"name": "file.pdf", "url": "http://..."}]`
- Files are NOT downloaded - only metadata is stored in `articles.attachments` jsonb field
- Attachment info is appended to article content for embedding generation

### Authentication Flow
1. User submits username/password to `/api/auth/token`
2. Backend validates against campus SSO (if `CAMPUS_AUTH_ENABLED=true`)
3. If SSO succeeds and user doesn't exist, auto-create user (if `AUTH_ALLOW_AUTO_USER_CREATION=true`)
4. Generate JWT access token (default TTL: 1 hour) and refresh token (default TTL: 7 days)
5. Client stores tokens in secure storage
6. Client includes `Authorization: Bearer <access_token>` header on protected endpoints
7. Backend decorator `@login_required` validates token and injects `request.auth_claims`

**JWT Token Structure:**
- Access token contains: `user_id`, `username`, `roles`, `exp`, `iat`
- Refresh token is hashed and stored server-side for validation

### Redis Caching Strategy
- Cache key pattern: Article lists cached by date range
- TTL: 5 days for article list cache
- ETag generation: Hash of article list JSON
- Last-Modified: `MAX(created_at)` from articles in the response
- 304 handling: Compare `If-None-Match` (ETag) or `If-Modified-Since` headers

### AI Summary Generation
- First pass: Attempt summary for all new articles
- Retry logic: Collect failures, retry up to 3 times
- Fallback: If still failing after 3 retries, insert placeholder summary and log error
- Never block article insertion on summary failure

### Mobile App Architecture
- **Navigation**: Expo Router with file-based routing in `app/(tabs)/`
- **State**: Read/unread maintained locally (not synced to backend)
- **Polling**: Planned background fetch to check `/articles?since=<last_check_timestamp>`
- **Notifications**: Local notifications on new articles (not push notifications)
- **Cache**: Article content and metadata cached locally for offline access

## Common Pitfalls

1. **Database connection errors**: Ensure `DATABASE_URL` is set and PostgreSQL is running with pgvector extension installed
2. **Redis connection failures**: Backend continues to work without Redis, but caching and 304 responses are disabled
3. **Crawler scheduling**: Production crawler should run every hour but ONLY between 07:00-24:00 (check cron/scheduler config)
4. **Campus SSO timeout**: Set `CAMPUS_AUTH_TIMEOUT` appropriately (default 10s) to avoid blocking login on network issues
5. **JWT secret rotation**: Changing `AUTH_JWT_SECRET` invalidates all existing tokens - users must re-login
6. **Embedding dimension mismatch**: `EMBED_DIM` must match the model's output dimension (e.g., 1024 for text-embedding-3-small)
7. **Date format consistency**: Always use `YYYY-MM-DD` format for dates in API params and database queries

## Testing Approach

**No formal test suite currently exists.** When adding tests:
- Use pytest for Python components
- Mock external dependencies (OA system, AI APIs, campus SSO)
- Test crawler deduplication logic thoroughly (critical for data integrity)
- Test authentication flow end-to-end (campus SSO integration is complex)
- Test Redis cache invalidation logic

## Project Status & Gaps

Based on `docs/development_plan.md`, the following gaps exist:

1. **Backend article endpoint**: Current implementation uses `start_date/end_date/limit/offset`, but plan requires `/articles?date=YYYY-MM-DD&since=ts` for incremental polling
2. **Background polling**: Mobile app lacks implementation of background fetch and notification triggering
3. **Monitoring & structured logging**: Not yet implemented (future plan)
4. **Rate limiting**: Basic rate limiting exists via flask-limiter but needs tuning for production
5. **Campus SSO error handling**: May need more robust retry/fallback logic

## Directory Structure Notes

- `backend/routes/` - Flask blueprints for each API domain
- `backend/services/` - Business logic (auth_service, campus_auth)
- `backend/repository/` - Database access layer (user_repository)
- `crawler/models.py` - Dataclasses for article metadata and detail results
- `crawler/pipeline.py` - Main Crawler class orchestrating the fetch-summarize-store flow
- `crawler/fetcher.py` - HTTP requests and HTML parsing for OA system
- `crawler/summarizer.py` - AI summary generation with retry logic
- `crawler/storage.py` - Database writes for articles and embeddings
- `OAP-app/app/(tabs)/` - Main tab navigation screens
- `OAP-app/components/` - Reusable React components

## External Dependencies

- OA system: `http://oa.stu.edu.cn` (university internal network required)
- Campus SSO: `http://a.stu.edu.cn/ac_portal/login.php`
- AI services: GLM-4.5-flash for summarization (default), configurable embedding service
- PostgreSQL with pgvector extension
- Redis (optional but recommended for production)

## Development Workflow

1. Set up PostgreSQL with pgvector and create database
2. Copy `env.example` files to `.env`/`env` and configure
3. Run backend: `cd backend && python -m backend.app`
4. Run crawler once to populate data: `cd crawler && python -m crawler.main`
5. Start mobile app: `cd OAP-app && npm start`
6. Test login flow with valid campus credentials

**When modifying crawler:**
- Always test with `--date` parameter to avoid polluting production data
- Check database for duplicates after run (should be zero if deduplication works)
- Monitor AI summary failure rate in logs

**When modifying backend:**
- Test with/without Redis to ensure graceful degradation
- Verify JWT token expiry and refresh flow
- Check CORS settings match your frontend origin

**When modifying mobile app:**
- Test on both iOS and Android if changing native modules
- Verify secure storage is working (JWT should persist across app restarts)
- Test offline mode - app should show cached articles when network is unavailable

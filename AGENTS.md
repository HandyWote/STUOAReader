# Repository Guidelines
##  TOP RULES
- 沟通机制：回复必须使用中文。对于非纯文本修改的任务，必须优先提供设计方案，待我确认后方可编写代码。
- 复用原则：严格优先使用项目现有的组件、工具类和架构模式。
    - 注意：由于你可能无法读取全量代码，如果你推测可能存在相关组件但不确定位置，请先询问我，而不是直接制造重复轮子。
- 代码质量与兼容性：在重构或修改功能时，若发现兼容性冲突：
    - 首选策略：暴露问题，提出彻底的改进方案（不妥协）。
    - 备选策略：如果彻底改进影响范围过大（超过5个文件或涉及核心底层），请同时提供一个“最小侵入性”的兼容方案（如适配器模式），并说明两者的利弊，由我决策。
    
## Project Structure & Module Organization
This repository is a multi-module project:
- `OAP-app/`: Expo React Native client. Screens live in `OAP-app/app/`, shared UI in `OAP-app/components/`, hooks in `OAP-app/hooks/`, assets in `OAP-app/assets/`.
- `backend/`: Flask API service. Entry point is `backend/app.py`, routes in `backend/routes/`, data access in `backend/repository/`, domain logic in `backend/services/`.
- `crawler/`: Data ingestion and summarization pipeline. Main runner is `crawler/main.py`.
- `docs/`: API docs and project notes (e.g., `docs/api_documentation.md`).

## Build, Test, and Development Commands
- `cd OAP-app && npm install && npm run start`: start Expo dev server (client).
- `cd OAP-app && npm run android|ios|web`: platform-specific Expo launches.
- `cd OAP-app && npm run lint`: run ESLint for the app.
- `python backend/app.py`: run Flask API locally (configure `backend/env.example`).
- `python crawler/main.py`: run crawler locally (configure `crawler/env.example`).
Note: `crawler/run.sh` is environment-specific; prefer direct `python` or `uv run`.

## Coding Style & Naming Conventions
- TypeScript/React: follow existing file-based routing in `OAP-app/app/` and component naming in `PascalCase` (e.g., `ArticleCard`).
- Python: follow 4-space indentation and module organization in `backend/` and `crawler/`.
- Linting: Expo app uses `eslint-config-expo` via `npm run lint`. No formatter is enforced for Python; keep style consistent with nearby files.

## Testing Guidelines
- No dedicated test suites are present in the repo.
- If adding backend tests, use `pytest` and place files under `backend/tests/` (example command in docs: `uv run pytest`).
- For app tests, add a clear runner command and document it in this file.

## Commit & Pull Request Guidelines
- Recent commit messages are short and action-focused, often in Chinese (e.g., `fix：修复对话框被遮挡`) and sometimes include a scope like `deploy(android): ...`. Follow this style for consistency.
- PRs should include: a clear description, linked issues if applicable, and screenshots for UI changes (especially under `OAP-app/`).
- Note any new env vars or config changes in the PR description.

## Security & Configuration Tips
- Use the provided `env.example` files in `backend/` and `crawler/`. For the app, set `EXPO_PUBLIC_API_BASE_URL` via `.env` or EAS build envs.
- Do not commit secrets or local credentials.

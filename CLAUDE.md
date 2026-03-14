# Yoga Guru Copilot Platform — Claude Code 项目规范

## 项目概述

瑜伽老师智能助手平台。前后端分离架构，5 个专业 AI Copilot 辅助瑜伽教学工作。

- **设计文档**: `docs/superpowers/specs/2026-03-14-yoga-guru-copilot-platform-design.md`
- **实施计划**: `docs/superpowers/plans/2026-03-14-phase-{d,a,c,b}-*.md`
- **Superpowers 参考**: `docs/references/superpowers-skills/` (只读参考，不要修改)

## 技术栈

### 前端
- React 18 + TypeScript + Vite 6
- Tailwind CSS v4 (Glassmorphism 玻璃拟态风格)
- TanStack Query v5 (异步状态管理)
- React Router v7
- Lucide React 图标
- 14 个标准化共享组件 (`src/components/shared/`)

### 后端
- Python 3.11+ / FastAPI
- SQLAlchemy (async) + Alembic
- SQLite (开发) / PostgreSQL (生产)
- Pydantic Settings + `.env`
- JWT 认证 (python-jose)

### AI 服务
- Azure OpenAI (GPT-4o) — 主要 LLM
- Azure Content Understanding — 视频分析
- MockAgentAdapter — 无 Azure 凭证时的开发回退

## 快捷指令

当用户说以下内容时，自动使用对应 skill：

| 用户说 | 执行 |
|--------|------|
| "开始开发" / "执行计划" | `superpowers:subagent-driven-development` |
| "头脑风暴" / "设计新功能" | `superpowers:brainstorming` |
| "写计划" / "制定开发计划" | `superpowers:writing-plans` |
| "调试" / "排查问题" | `superpowers:systematic-debugging` |
| "代码审查" / "review" | `superpowers:requesting-code-review` |
| "完成开发" / "准备合并" | `superpowers:finishing-a-development-branch` |
| "并行执行" | `superpowers:dispatching-parallel-agents` |
| "验证完成" | `superpowers:verification-before-completion` |

## 文档演进策略 (Delta Spec)

### 原则
- **原始 spec 不修改** — 作为基线存档
- **新功能 / 迭代** → 创建新的 delta spec 文件
- **命名格式**: `docs/superpowers/specs/YYYY-MM-DD-<feature-name>.md`
- **每个 delta spec** 对应一个新的 plan 文件

### 示例
```
docs/superpowers/specs/
├── 2026-03-14-yoga-guru-copilot-platform-design.md   # 基线设计 (不动)
├── 2026-03-20-pose-library-feature.md                 # 新功能 delta
├── 2026-04-01-multi-language-support.md               # 迭代 delta
```

### 触发方式
- 用户说 "设计新功能 XXX" → brainstorming → 新 spec 文件 → writing-plans → 新 plan
- 用户说 "修改 XXX 功能" → 评估改动大小：小改直接修改原 plan；大改创建 delta spec

## 实施阶段与顺序

```
Phase D (基础设施) → Phase A (课程规划) → Phase C (问卷管理) → Phase B (视频+照片)
```

每个 Phase 独立可交付。使用 `subagent-driven-development` 执行时，每个 Task 分派独立子 agent。

## 代码规范

### 后端 (Python)
- 使用 async/await 全链路异步
- Pydantic v2 的 `model_config = {"from_attributes": True}` 用于 ORM 序列化
- datetime 字段在 schema 中使用 `datetime` 类型，不用 `str`
- 异常使用 `-> NoReturn` 类型注解
- 路由注册使用延迟导入避免循环依赖

### 前端 (TypeScript/React)
- 使用 `@/` 路径别名
- API 调用统一通过 `src/api/client.ts` 的 axios 实例
- 所有数据获取使用 TanStack Query hooks
- 共享组件在 `src/components/shared/`，不要重复造轮子

### Git
- commit message 使用 conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- 不要自动 push，等用户确认
- 不要自动 commit，等用户明确要求

## 语言偏好

- 用户交流：中文
- 代码注释：中英文均可
- commit message：英文
- 文档：中文为主 (spec/plan)，代码文档英文

## 注意事项

- 后端 uploads/ 目录已 gitignore，不要提交上传文件
- `.env` 文件不提交，使用 `.env.example` 作为模板
- 开发环境不需要 Azure 凭证，MockAgentAdapter 提供回退
- WebSocket 通过 Vite proxy 转发，前端使用相对路径

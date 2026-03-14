# CLAUDE.md — Yoga Guru Copilot Platform

> **定位**: Claude Code 的工程操作手册 — 只关注 **HOW**（怎么开发），不重复 **WHAT**（系统做什么）。
> 产品需求、功能设计由 `docs/superpowers/specs/` 管理。
> 本文件中的所有指令 OVERRIDE 默认行为，MUST 严格遵循。

---

## 1. 文档分层体系

```
CLAUDE.md                              ← 工程手册：HOW（流程、规范、约束）
docs/superpowers/
  ├── specs/                           ← 产品规格：WHAT（需求、设计、API 契约）
  │   ├── 2026-03-14-...-design.md     ←   基线设计 v1.0（归档后不修改）
  │   ├── YYYY-MM-DD-<feature>.md      ←   Delta Spec（新功能/增强）
  │   └── ...
  ├── plans/                           ← 施工图纸：HOW EXACTLY（文件、代码、命令）
  │   ├── 2026-03-14-phase-d-*.md      ←   Phase D 计划
  │   └── ...
docs/issues/                           ← Bug 追踪：YYYY-MM-DD-<bug>.md
docs/references/superpowers-skills/    ← Superpowers 技能参考（只读）
.claude/skills/                        ← 项目 Slash Commands（/brainstorm, /dev 等）
```

### 查阅指引

| 你想知道… | 去看… |
|-----------|-------|
| 整体产品设计、模块划分、数据模型？ | `docs/superpowers/specs/2026-03-14-yoga-guru-copilot-platform-design.md` |
| 某个 Phase 的具体实施步骤？ | `docs/superpowers/plans/2026-03-14-phase-{d,a,c,b}-*.md` |
| 某个新功能的设计提案？ | `docs/superpowers/specs/YYYY-MM-DD-<feature>.md` |
| 某个 bug 的追踪记录？ | `docs/issues/YYYY-MM-DD-<bug>.md` |
| Superpowers 各 skill 怎么用？ | `docs/references/superpowers-skills/<skill>/SKILL.md` |
| 怎么跑项目？怎么提交？代码怎么写？ | **本文件 (CLAUDE.md)** |

### 不重叠原则

- **CLAUDE.md 绝不重复** specs 中已有的产品规格
- 需要引用产品规格时，**写路径引用**，不复制内容

---

## 2. 版本化开发流程

### Phase 0 → v1.0.0（当前阶段：首版构建）

首版使用完整的 Phase 计划直接实施：

```
Phase D (基础设施) → Phase A (课程规划) → Phase C (问卷管理) → Phase B (视频+照片)
```

每个 Phase 独立可交付。执行方式：`/dev <plan file>`

### v1.0.0 之后：Delta Spec + Issue 驱动

**当版本号升至 1.0.0 后，不再创建新的 Phase 计划。** 所有变更通过以下两种方式管理：

#### 新功能 / 增强 → Delta Spec

```
/delta-spec <描述>
  → brainstorming → 新 spec 文件
  → /plan <spec file> → 新 plan 文件
  → /dev <plan file> → 实施
```

Delta Spec 文件规范：
- 保存到: `docs/superpowers/specs/YYYY-MM-DD-<feature-name>.md`
- MUST 包含: 基线引用、变更内容、不变内容、迁移策略
- 基线 spec **永远不修改**，只增加新的 delta 文件

#### Bug 修复 → Issue

```
/bug-fix <描述>
  → 创建 docs/issues/YYYY-MM-DD-<bug>.md
  → systematic-debugging → 定位根因
  → 写测试 → 修复 → 验证
```

#### 流程对比

| 场景 | v1.0 之前 | v1.0 之后 |
|------|-----------|-----------|
| 新功能 | Phase plan 中的 Task | `/delta-spec` → `/plan` → `/dev` |
| Bug 修复 | 直接修 | `/bug-fix` (创建 issue 文档) |
| 增强/优化 | Phase plan 中的 Task | `/delta-spec` (小改可跳过 spec) |
| 数据模型变更 | Plan 中包含 migration | Delta spec MUST 描述 migration 策略 |

---

## 3. 项目 Slash Commands

以下命令在 `.claude/skills/` 中定义，输入 `/` 可触发：

| 命令 | 用途 | 何时用 |
|------|------|--------|
| `/brainstorm <描述>` | 头脑风暴，设计新功能 | 有新想法时 |
| `/plan <spec路径>` | 从 spec 生成实施计划 | spec 确认后 |
| `/dev <plan路径>` | 子 agent 驱动开发 | 开始写代码 |
| `/debug <问题>` | 系统化调试 | 遇到 bug 时 |
| `/review <范围>` | 代码审查 | 功能完成后 |
| `/verify` | 运行全部检查 | 提交前 |
| `/delta-spec <描述>` | 创建增量需求 (v1.0+) | 新功能迭代 |
| `/bug-fix <描述>` | Bug 追踪与修复 (v1.0+) | 线上/测试 bug |

**中文快捷映射**（自然语言也可触发）:

| 用户说 | 等同于 |
|--------|--------|
| "开始开发" / "执行计划" | `/dev` |
| "头脑风暴" / "设计新功能" | `/brainstorm` 或 `/delta-spec` |
| "写计划" / "制定开发计划" | `/plan` |
| "调试" / "排查问题" | `/debug` |
| "代码审查" | `/review` |
| "验证完成" | `/verify` |
| "修 bug" / "有个 bug" | `/bug-fix` |

---

## 4. 项目结构速查

```
yoga-guru-copilot-platform/
├── src/                               # 前端 (React 18 + Vite 6)
│   ├── components/
│   │   ├── shared/                    # 14 个标准化共享组件
│   │   └── agent/                     # Agent Chat 组件 (待建)
│   ├── pages/                         # 5 个功能页 + Login (待建)
│   ├── api/                           # API client (待建)
│   ├── hooks/                         # TanStack Query hooks (待建)
│   ├── stores/                        # 状态管理 (待建)
│   └── types/                         # TypeScript 类型 (待建)
├── backend/                           # 后端 (Python FastAPI) — 全部待建
│   ├── app/
│   │   ├── main.py                    # FastAPI 入口
│   │   ├── config.py                  # Pydantic Settings
│   │   ├── database.py                # async SQLAlchemy
│   │   ├── models/                    # ORM 模型
│   │   ├── schemas/                   # Pydantic 验证
│   │   ├── routers/                   # API 路由
│   │   ├── services/                  # 业务逻辑
│   │   │   └── agents/                # Agent 三层架构
│   │   └── utils/
│   ├── scripts/                       # init_db.py, seed_data.py
│   ├── alembic/                       # 数据库迁移
│   ├── tests/
│   └── requirements.txt
├── docs/
│   ├── superpowers/specs/             # 产品规格
│   ├── superpowers/plans/             # 实施计划
│   ├── issues/                        # Bug 追踪 (v1.0+)
│   └── references/                    # Superpowers skills 参考
└── .claude/skills/                    # 项目 Slash Commands
```

---

## 5. 技术栈

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

---

## 6. 本地开发

### 启动顺序 (CRITICAL)

Backend 必须先于 Frontend 启动（Vite proxy 将 `/api` 转发到后端）。

```bash
# Terminal 1: Backend (port 8000)
cd backend && pip install -r requirements.txt
python scripts/init_db.py && python scripts/seed_data.py  # 首次
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend (port 5173)
npm install  # 首次
npm run dev
```

- API 前缀: `/api`
- 前端出现 `ECONNREFUSED` = 后端没启动，不是代码 bug
- WebSocket 通过 Vite proxy 转发: `/api/agents/ws/`

---

## 7. 提交前检查 (CRITICAL)

**每次代码变更，提交前 MUST 全部通过（或用 `/verify`）：**

```bash
# Backend
cd backend
python -m pytest tests/ -v          # 全部测试通过
# (v1.0+ 增加: ruff check . && ruff format --check .)

# Frontend
npx tsc -b                          # TypeScript 类型检查
npm run build                       # 完整 Vite 构建
```

---

## 8. 编码规范

### Python / Backend

- **全异步**: 所有 DB 操作用 `async/await` + `AsyncSession`
- **Pydantic v2**: `model_config = {"from_attributes": True}` 用于 ORM 序列化
- **datetime 字段**: schema 中使用 `datetime` 类型，不用 `str`
- **异常函数**: 使用 `-> NoReturn` 类型注解
- **路由注册**: 使用延迟导入避免循环依赖
- **API 惯例**: 创建返回 201，删除返回 204
- **路由顺序**: 静态路径 (`/defaults`) 必须在参数化路径 (`/{id}`) **之前**

### TypeScript / Frontend

- **路径别名**: 使用 `@/` 映射到 `src/`
- **API 调用**: 统一通过 `src/api/client.ts` 的 axios 实例
- **数据获取**: 全部使用 TanStack Query hooks
- **共享组件**: 在 `src/components/shared/`，不要重复造轮子
- **未使用 import = 构建失败** (TS6133, `tsc -b` 视为硬错误)
- **严格模式**: TypeScript strict 已开启

### 资源生命周期 (CRITICAL)

外部连接必须确保关闭，防止泄露：

```python
# ✅ 推荐: context manager
async with AsyncSessionLocal() as db:
    result = await do_work(db)

# ❌ 禁止: 裸创建不关闭
db = AsyncSessionLocal()
result = await do_work(db)  # session 泄露!
```

### Git

- commit message 使用 conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- **不要自动 push**，等用户确认
- **不要自动 commit**，等用户明确要求
- 不跳过 hooks (不使用 `--no-verify`)

---

## 9. 数据库规则

### Schema 变更必须走 Alembic

`create_all()` 只建新表，不改已有表。修改模型（加/删/改列）时 MUST：

1. 写新 Alembic migration: `alembic revision --autogenerate -m "<description>"`
2. 执行: `alembic upgrade head`
3. 测试: 确认新环境从零可以 `alembic upgrade head` 成功

### Model 导入

`models/__init__.py` 必须导入所有 model，确保 `Base.metadata` 包含全部表。

### 禁止手动删除 DB 文件

开发 DB (`yoga_guru.db`) 可能包含测试数据。用 migration 管理 schema，不要删文件重建。

---

## 10. 语言偏好

- 用户交流：**中文**
- 代码注释：中英文均可
- commit message：**英文**
- spec/plan 文档：**中文**为主
- 代码文档 (docstring)：**英文**

---

## 11. 踩坑清单

| # | 陷阱 | 教训 |
|---|------|------|
| 1 | Pydantic `created_at: str` | ORM 返回 `datetime`，schema 也用 `datetime` |
| 2 | `requirements.txt` 重复行 | pip 报警告，检查去重 |
| 3 | `@types/react-markdown` | 不存在！react-markdown 自带类型 |
| 4 | `EmailStr` 未使用 import | 要么用它（+email-validator 依赖），要么删掉 |
| 5 | Vite WS proxy | 需要 `ws: true` 配置项，否则 WebSocket 连不上 |
| 6 | main.py 循环导入 | 路由注册用延迟导入 `register_routers()` |
| 7 | 异常函数无返回注解 | `not_found()` 需要 `-> NoReturn`，否则类型检查器报警 |
| 8 | Alembic async env.py | 非平凡配置，需要完整的 `run_async_migrations()` 模式 |
| 9 | 前端 ECONNREFUSED | 后端没启动，不是代码问题 |
| 10 | uploads/ 提交 | 已 gitignore，不要手动 add |

---

## 12. 注意事项

- `.env` 文件不提交，使用 `backend/.env.example` 作为模板
- 开发环境不需要 Azure 凭证，MockAgentAdapter 提供回退
- WebSocket 通过 Vite proxy 转发，前端使用相对路径
- `docs/references/superpowers-skills/` 是只读参考，不要修改

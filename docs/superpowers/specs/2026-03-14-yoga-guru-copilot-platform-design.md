# Yoga Guru Copilot Platform — 设计文档

**日期**: 2026-03-14
**状态**: Approved

## 1. 产品定位

Yoga Guru Copilot Platform 是一个瑜伽老师的智能助手平台。"Copilot" 指的是帮助 Guru（瑜伽老师）完成教学工作的专业 AI 助手。平台提供 5 个专业 Copilot，底层使用 Claude Code / GitHub Copilot / Codex / OpenCode 等强力 Agent 引擎，对用户完全透明。

### 用户角色

- **普通 Guru（瑜伽老师）**: 使用预配置的 Copilot 完成教学工作，不接触底层配置
- **管理员 / 高级 Guru**: 编辑 Copilot prompt、管理 skill、配置 Agent 优先级、创建自定义 Copilot

## 2. 技术架构

### 前端
- **React 18** + TypeScript + Vite 6
- **Tailwind CSS v4** 设计系统（Glassmorphism 玻璃拟态）
- **TanStack Query** 异步状态管理
- **React Router v7** 路由
- **Lucide React** 图标
- 14 个标准化共享组件（已完成）

### 后端
- **Python FastAPI** RESTful API + WebSocket
- **SQLAlchemy** ORM（async）+ **Alembic** 数据库迁移
- **Pydantic Settings** 配置管理
- **JWT** 认证

### 数据库
- **开发/测试**: SQLite（文件或内存）
- **生产**: PostgreSQL
- Schema 和 seed data 通过脚本管理，可重复执行

### 外部服务
- **Azure OpenAI** (GPT-4o) — LLM 能力（课程生成、文案生成、问卷生成等）
- **Azure Content Understanding** — 视频内容分析、关键帧提取、体式识别
- **Azure Blob Storage**（可选）— 视频/图片文件存储（开发阶段用本地文件系统）

### 服务配置
使用 Pydantic Settings + `.env` 文件统一管理所有外部服务配置：
- Azure OpenAI (endpoint, key, deployment, version)
- Azure Content Understanding (endpoint, key)
- Azure Blob Storage (connection string, container)
- Database URL
- JWT secret

## 3. Agent / Copilot 模块设计

### 3.1 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  瑜伽专业层 — 5 个 Copilot (Prompt + Skill + Context)    │
│  课程规划 | 视频分析 | 问卷管理 | 内容创作 | 通用助手     │
├─────────────────────────────────────────────────────────┤
│  调度层 — Failover / 路由选择 / Agent Team 编排           │
├─────────────────────────────────────────────────────────┤
│  CLI Agent 层 — Claude Code | Copilot | Codex | OpenCode │
│  (复用 ragflow-skill-orchestrator-studio 基础设施)        │
└─────────────────────────────────────────────────────────┘
```

### 3.2 复用 ragflow 基础设施

从 `huqianghui/ragflow-skill-orchestrator-studio-vibe-coding` 复用：

**直接复用（~60-70%）:**
- `base.py` — BaseAgentAdapter 抽象基类 + AgentMode/AgentInfo/AgentContext/AgentRequest/AgentEvent 数据类型 + 流式子进程工具函数
- `registry.py` — Agent 注册发现（singleton, TTL 缓存, DB 持久化）
- `session_proxy.py` — 会话 CRUD + 消息持久化
- `adapters/claude_code.py` — Claude Code CLI 适配器
- `adapters/copilot.py` — GitHub Copilot CLI 适配器
- `adapters/codex.py` — Codex CLI 适配器
- `models/agent_config.py` — Agent 配置 ORM 模型
- `models/agent_session.py` — 会话 ORM 模型
- `models/agent_message.py` — 消息 ORM 模型
- `models/base.py` — UUID + 时间戳基类
- `schemas/agent.py` — Pydantic 请求/响应验证
- `database.py` — async SQLAlchemy 引擎配置
- `utils/exceptions.py` — HTTP 异常类
- 前端: `agentApi.ts` (REST + WebSocket), `agent.ts` (类型), `MessageBubble.tsx`

**适配修改:**
- `context_builder.py` — 替换 skill/pipeline 上下文为瑜伽模块上下文
- `api/agents.py` — 增加瑜伽特定端点
- `AgentChatWidget.tsx` — 适配 Glassmorphism 样式

**全新编写:**
- `dispatcher.py` — Failover + Agent Team 调度逻辑
- `adapters/opencode.py` — OpenCode 适配器
- `yoga/prompts/*.md` — 5 个 Copilot 的 system prompt
- `yoga/skills/*.py` — 瑜伽领域 skill
- `yoga/agent_configs.py` — 预置 Copilot 配置（seed data）

### 3.3 五个 Copilot

| Copilot | 职能 | Prompt 方向 | Skills |
|---------|------|-------------|--------|
| 课程规划助手 | 体式序列设计、课程编排 | 瑜伽课程编排专家 | sequence-generator, pose-database, class-template |
| 视频分析助手 | 教学视频分析、风格评估 | 瑜伽教学视频分析专家 | video-analysis, frame-extraction, style-assessment |
| 问卷管理助手 | 问卷生成、反馈分析 | 学员反馈分析专家 | survey-generator, feedback-analyzer, reply-composer |
| 内容创作助手 | 朋友圈文案、社交媒体 | 瑜伽自媒体内容专家 | caption-writer, brand-voice, social-media-optimizer |
| 通用助手 | 跨模块问答、瑜伽知识 | 资深瑜伽教学顾问 | yoga-knowledge-base, teaching-methodology |

### 3.4 调度策略

**Failover（Phase 1 实现）:**
每个 Copilot 配置 `preferred_agent` + `fallback_agents`。按优先级尝试，不可用时自动降级。

**Agent Team（后续增强）:**
多个底层 Agent 协作完成复杂任务，支持串行、并行、融合等编排策略。

### 3.5 管理界面

管理员可通过「Copilot 管理」页面：
- 编辑 Copilot 的 system_prompt（在线 Markdown 编辑器）
- 管理 skill（分配/移除/创建自定义 skill）
- 配置底层 Agent 优先级和 failover 顺序
- 查看 Agent 可用性状态
- 创建自定义 Copilot

## 4. 功能模块

### 4.1 仪表板
- 实时统计（视频数、课程数、学员反馈、问卷数）
- 快捷操作入口
- 近期活动动态
- 数据来自后端 API 聚合

### 4.2 视频内容分析
- 视频上传（本地存储 / Azure Blob Storage）
- Azure Content Understanding 视频内容分析
- 授课风格和教学理念提取（Azure OpenAI 辅助）
- 关键帧智能提取（优质展示帧 + 教学改进帧）
- 视频分析 Copilot 辅助问答

### 4.3 课程规划
- 课程 CRUD（创建/编辑/删除/列表）
- Copilot AI 生成体式序列
- 体式数据库
- 课程模板
- 课程规划 Copilot 辅助编排

### 4.4 问卷管理
- 问卷 CRUD
- Copilot AI 生成问卷问题
- 反馈收集与统计
- 满意度分析
- AI 生成个性化回复建议

### 4.5 照片处理
- 从视频分析关键帧联动
- 帧分类（优质展示 / 教学改进）
- 朋友圈拼图生成
- Copilot 生成朋友圈文案
- 教学对比图制作

### 4.6 Copilot 管理（管理员）
- Copilot Prompt 编辑
- Skill 管理
- 底层 Agent 配置
- 自定义 Copilot 创建

## 5. 数据模型概要

### 核心表
- `users` — 用户（角色: guru / admin）
- `courses` — 课程序列
- `course_poses` — 课程体式（关联 course）
- `surveys` — 问卷
- `survey_questions` — 问卷问题
- `survey_responses` — 学员反馈
- `videos` — 上传视频
- `video_analyses` — 视频分析结果
- `video_frames` — 提取的关键帧
- `agent_configs` — Copilot / Agent 配置（复用 ragflow）
- `agent_sessions` — 对话会话（复用 ragflow）
- `agent_messages` — 对话消息（复用 ragflow）

### 数据库策略
- SQLAlchemy ORM + Alembic migration
- 开发: SQLite，生产: PostgreSQL
- `scripts/init_db.py` 创建表结构
- `scripts/seed_data.py` 初始化数据（含 5 个 Copilot 配置）

## 6. 项目目录结构

```
yoga-guru-copilot-platform/
├── src/                            # 前端 (React)
│   ├── components/shared/          # 14 个标准化共享组件 ✓
│   ├── components/agent/           # Agent Chat 组件 (复用 ragflow)
│   ├── pages/                      # 功能页面 (5 + Copilot 管理)
│   ├── api/                        # API client 层
│   ├── hooks/                      # 自定义 hooks
│   ├── stores/                     # 全局状态
│   └── types/                      # 类型定义
├── backend/                        # 后端 (FastAPI)
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口
│   │   ├── config.py               # Pydantic Settings
│   │   ├── database.py             # SQLAlchemy 引擎
│   │   ├── models/                 # ORM 模型
│   │   ├── schemas/                # Pydantic 验证
│   │   ├── routers/                # API 路由
│   │   ├── services/               # 业务逻辑
│   │   │   ├── agents/             # Agent 基础设施 (复用 ragflow)
│   │   │   │   ├── base.py
│   │   │   │   ├── registry.py
│   │   │   │   ├── session_proxy.py
│   │   │   │   ├── context_builder.py
│   │   │   │   ├── dispatcher.py
│   │   │   │   ├── adapters/
│   │   │   │   └── yoga/           # 瑜伽专业层
│   │   │   │       ├── prompts/
│   │   │   │       ├── skills/
│   │   │   │       └── agent_configs.py
│   │   │   ├── ai_service.py       # Azure OpenAI 封装
│   │   │   ├── video_service.py    # Azure Content Understanding
│   │   │   └── file_service.py     # 文件存储
│   │   └── utils/
│   ├── scripts/
│   │   ├── init_db.py
│   │   └── seed_data.py
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
├── docs/
├── package.json
└── vite.config.ts
```

## 7. 实现阶段

### Phase D: 全栈基础设施 + Agent 模块
- FastAPI 项目骨架 + CORS + JWT 认证
- SQLAlchemy + Alembic + SQLite
- 复用 ragflow Agent 基础设施
- Failover 调度器
- 前端 API client + TanStack Query + Agent Chat Panel
- DB init + seed 脚本（含 5 个 Copilot 配置）
- 服务配置模块（Pydantic Settings + .env）

### Phase A: 课程规划
- Course CRUD API
- 课程规划 Copilot prompt + skill
- AI 生成体式序列
- 前端表单改造 + Copilot 辅助
- Dashboard 实时数据

### Phase C: 问卷管理
- Survey CRUD API
- 问卷 Copilot prompt + skill
- AI 生成问卷 + 回复建议
- 满意度统计分析

### Phase B: 视频分析 + 照片处理
- 视频上传 + 存储
- Azure Content Understanding 集成
- 关键帧提取 + 分类
- 视频分析 Copilot prompt + skill
- 照片处理模块联动
- 朋友圈文案 Copilot

### 实现方式
使用 Ralph Loop 逐个 Phase 迭代实现。每个 Phase 独立可交付。

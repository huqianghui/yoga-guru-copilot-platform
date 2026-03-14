# 瑜伽老师助手平台 (Yoga Guru Copilot Platform)

瑜伽老师的智能助手平台，帮助老师管理课程、分析教学视频、处理照片并生成朋友圈内容。

## Deployment URLs

| Service  | URL |
|----------|-----|
| Frontend | https://yoga-guru-frontend.bluedesert-3de420f7.eastus.azurecontainerapps.io/ |
| Backend  | https://yoga-guru-backend.bluedesert-3de420f7.eastus.azurecontainerapps.io/ |
| Health Check | https://yoga-guru-backend.bluedesert-3de420f7.eastus.azurecontainerapps.io/api/health |

## 功能模块

- **仪表板** - 数据概览、快捷操作、近期动态
- **视频内容分析** - 上传录播视频，AI 提取授课风格与教学理念，智能抽取关键帧
- **课程规划** - 创建课程序列、管理体式编排、生成教学大纲
- **问卷管理** - 创建和管理学员反馈问卷，查看统计分析
- **照片处理** - 关键帧分类（优质展示 / 教学改进），生成朋友圈拼图与文案

## 技术栈

### 前端
- **React 18** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4** + Glassmorphism 玻璃拟态风格
- **TanStack Query v5** + **React Router v7**
- **Lucide React** 图标 + **shadcn/ui** 组件模式

### 后端
- **Python 3.11** + **FastAPI**
- **SQLAlchemy (async)** + **Alembic** 迁移
- **JWT 认证** (python-jose)

### AI 服务
- **Azure OpenAI** (GPT-4o) — 主要 LLM
- **Anthropic Claude** / **OpenAI Native** — 多适配器支持
- **Azure Content Understanding** — 视频分析

### 基础设施
- **Azure Container Apps** + **ACR**
- **GitHub Actions** CI/CD (OIDC 认证)

## 设计系统

- **风格**: Glassmorphism 玻璃拟态
- **主色**: 紫色 (#8B5CF6) + 绿色 (#059669) 渐变
- **字体**: Lora (标题) + Raleway (正文)
- **圆角**: rounded-2xl (1rem)
- **14 个标准化共享组件**: PageHeader, GlassCard, StatCard, GradientButton, ListItem, InsightCard, FormField, SelectionCard, Badge, ProgressBar, IconBox, QuickActionCard, SectionTitle, InfoBox

## 快速开始

```bash
# Backend (port 8000)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# 首次启动自动建表 + 种子数据

# Frontend (port 5173)
cd frontend
npm install
npm run dev
```

## 项目结构

```
src/
├── components/
│   ├── shared/          # 14 个标准化共享组件
│   └── Layout.tsx       # 主布局（侧边栏 + 内容区）
├── pages/               # 5 个功能页面
│   ├── Dashboard.tsx
│   ├── VideoAnalysis.tsx
│   ├── CoursePlanning.tsx
│   ├── QuestionnaireManagement.tsx
│   └── PhotoProcessing.tsx
├── lib/
│   └── utils.ts         # 工具函数
├── styles/
│   └── index.css        # 设计 Token + Tailwind 配置
├── routes.tsx           # 路由配置
└── main.tsx             # 入口文件
```

## License

MIT

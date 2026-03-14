# 瑜伽老师助手平台 (Yoga Guru Copilot Platform)

瑜伽老师的智能助手平台，帮助老师管理课程、分析教学视频、处理照片并生成朋友圈内容。

## 功能模块

- **仪表板** - 数据概览、快捷操作、近期动态
- **视频内容分析** - 上传录播视频，AI 提取授课风格与教学理念，智能抽取关键帧
- **课程规划** - 创建课程序列、管理体式编排、生成教学大纲
- **问卷管理** - 创建和管理学员反馈问卷，查看统计分析
- **照片处理** - 关键帧分类（优质展示 / 教学改进），生成朋友圈拼图与文案

## 技术栈

- **React 18** + **TypeScript**
- **Vite 6** 构建工具
- **Tailwind CSS v4** 样式系统
- **React Router v7** 路由
- **Lucide React** 图标库
- **shadcn/ui** 组件模式（Radix UI）

## 设计系统

- **风格**: Glassmorphism 玻璃拟态
- **主色**: 紫色 (#8B5CF6) + 绿色 (#059669) 渐变
- **字体**: Lora (标题) + Raleway (正文)
- **圆角**: rounded-2xl (1rem)
- **14 个标准化共享组件**: PageHeader, GlassCard, StatCard, GradientButton, ListItem, InsightCard, FormField, SelectionCard, Badge, ProgressBar, IconBox, QuickActionCard, SectionTitle, InfoBox

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
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

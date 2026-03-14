# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Azure Container Apps                   │
│                                                           │
│  ┌──────────────────┐     ┌──────────────────────────┐   │
│  │  Frontend (nginx) │────▶│  Backend (FastAPI/Uvicorn)│  │
│  │  React + Vite     │ /api│                          │   │
│  │  Port 80          │     │  Port 8000               │   │
│  └──────────────────┘     └─────────┬────────────────┘   │
│                                      │                    │
│                            ┌─────────▼────────────┐      │
│                            │  SQLite / PostgreSQL  │      │
│                            └──────────────────────┘      │
│                                      │                    │
│                            ┌─────────▼────────────┐      │
│                            │  Azure OpenAI (GPT-4o)│     │
│                            │  Azure Content Underst.│     │
│                            └──────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

## Frontend Architecture

```
frontend/src/
├── components/
│   ├── shared/          # 14 standardized shared components
│   ├── agent/           # Agent Chat Panel (right sidebar)
│   └── Layout.tsx       # 3-column layout (nav + content + agent)
├── pages/               # 5 feature pages + Login
├── api/                 # Axios client + typed API functions
├── hooks/               # TanStack Query hooks
├── contexts/            # PageAgentContext (route→agent mapping)
├── stores/              # State management
└── types/               # TypeScript type definitions
```

### Key Patterns
- **TanStack Query v5** for server state management
- **PageAgentContext** maps each route to a default Copilot
- **Right sidebar** agent panel with expand/collapse, context-aware
- **Glassmorphism** design with Tailwind CSS v4

## Backend Architecture

```
backend/app/
├── main.py              # FastAPI app + lifespan (auto-init DB + seed)
├── config.py            # Pydantic Settings (.env)
├── database.py          # Async SQLAlchemy engine + session
├── models/              # ORM models (User, Copilot, Conversation, etc.)
├── schemas/             # Pydantic v2 request/response schemas
├── routers/             # API route handlers
├── services/
│   ├── auth.py          # JWT auth service
│   ├── startup.py       # Auto DB init + seed on first boot
│   └── agents/          # 3-layer Agent architecture
│       ├── base.py      # BaseAgentAdapter ABC
│       ├── registry.py  # Adapter registry
│       ├── dispatcher.py# Failover dispatcher
│       └── adapters/    # Azure OpenAI + Mock adapters
└── utils/
```

### Agent 3-Layer Architecture

1. **BaseAgentAdapter** (ABC) — Defines the streaming interface
2. **AdapterRegistry** — Registers and looks up adapters by name
3. **FailoverDispatcher** — Routes requests, falls back to Mock if Azure unavailable

### Authentication Flow

```
Login → POST /api/auth/token → JWT token
     → Stored in localStorage
     → Sent as Authorization: Bearer <token>
     → Verified by get_current_user dependency
```

## Database

- **Dev**: SQLite via aiosqlite (auto-created on first start)
- **Prod**: PostgreSQL via asyncpg
- **Migrations**: Alembic with async support
- **Auto-init**: Tables created + seed data on first startup (idempotent)

## Deployment

- **Docker**: Multi-stage builds (frontend: node→nginx, backend: python-slim)
- **Registry**: Azure Container Registry (ACR)
- **Hosting**: Azure Container Apps (separate frontend/backend containers)
- **CI/CD**: GitHub Actions with OIDC auth to Azure

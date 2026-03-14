# Changelog

## v0.4.0 — Infrastructure & CI/CD (2026-03-14)

### Added
- Docker infrastructure: backend Dockerfile, frontend Dockerfile (multi-stage with nginx), docker-compose.yml
- GitHub Actions CI/CD: build + test + deploy to Azure Container Apps
- GitHub Wiki auto-sync workflow
- GitHub Project sync workflow for plan task tracking
- `.dockerignore` for optimized builds

---

## v0.3.0 — Agent Panel Redesign (2026-03-14)

### Changed
- Redesigned Agent Chat Panel from floating popup to integrated right sidebar
- Added PageAgentContext for route-to-agent mapping and page context awareness
- Each page now has a default Copilot that auto-activates on navigation
- Agent panel provides page context in first message for better AI assistance

### Added
- `PageAgentContext.tsx` — route-to-agent mapping provider
- Radix UI Select dropdown for Copilot selection
- Collapsible right sidebar (400px expanded, 56px collapsed)

---

## v0.2.0 — Frontend Restructure + Startup (2026-03-14)

### Changed
- Moved frontend from root to `frontend/` directory for Azure Container Apps deployment
- Backend auto-initializes DB tables and seed data on first startup (no manual scripts needed)
- Copilot selector changed from grid to Radix UI dropdown

### Added
- `backend/app/services/startup.py` — idempotent auto-init + seed

---

## v0.1.0 — Phase D Infrastructure (2026-03-14)

### Added
- Complete FastAPI backend with async SQLAlchemy
- JWT authentication (login/register/profile)
- 3-layer Agent architecture (BaseAdapter → Registry → FailoverDispatcher)
- Azure OpenAI streaming adapter + MockAgentAdapter fallback
- 5 Yoga Copilots with specialized Chinese system prompts
- WebSocket endpoint for streaming chat
- React frontend with TanStack Query v5 + axios API client
- Login page with JWT token management
- Agent Chat Panel with Copilot selection
- 14 standardized shared components (Glassmorphism style)
- Alembic migration setup
- Vite proxy configuration
- Backend smoke tests

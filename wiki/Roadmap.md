# Roadmap

## Implementation Phases

The platform is built in 4 phases, each independently deliverable:

```
Phase D (Infrastructure) → Phase A (Course Planning) → Phase C (Questionnaire) → Phase B (Video & Photo)
```

---

## Phase D: Full-Stack Infrastructure + Agent Module (Done)

Build the complete backend (FastAPI + SQLAlchemy + JWT) and Agent/Copilot module. Connect the React frontend with real API calls.

| # | Task | Status |
|---|------|--------|
| 1 | Python project scaffold | Done |
| 2 | Database layer | Done |
| 3 | Auth service + router | Done |
| 4 | Agent models + schemas | Done |
| 5 | Agent service layer (base + registry + dispatcher) | Done |
| 6 | Agent adapters (Azure OpenAI + Mock) | Done |
| 7 | Agent API router (REST + WebSocket) | Done |
| 8 | Seed data script | Done |
| 9 | Install frontend dependencies + API client | Done |
| 10 | Auth API + hooks + Login page | Done |
| 11 | Agent Chat Panel component | Done |
| 12 | Wire everything together | Done |
| 13 | Alembic setup | Done |
| 14 | Vite proxy + environment config | Done |
| 15 | Backend smoke test | Done |
| 16 | Final integration verification | Done |

---

## Phase A: Course Planning Module (Todo)

Build the Course Planning module with full CRUD API and AI-powered pose sequence generation.

| # | Task | Status |
|---|------|--------|
| 1 | Course models | Todo |
| 2 | Course schemas + service | Todo |
| 3 | Course router | Todo |
| 4 | Frontend course API + hooks | Todo |
| 5 | Rewrite CoursePlanning page with real API | Todo |
| 6 | Update Dashboard with real stats | Todo |
| 7 | Backend test for courses | Todo |

---

## Phase C: Questionnaire Management Module (Todo)

Build the Questionnaire Management module with CRUD API, AI-powered question generation, and feedback analysis.

| # | Task | Status |
|---|------|--------|
| 1 | Survey models | Todo |
| 2 | Survey schemas, service, and router | Todo |
| 3 | Frontend survey API + hooks | Todo |
| 4 | Rewrite QuestionnaireManagement page | Todo |
| 5 | Backend tests + final verification | Todo |

---

## Phase B: Video Analysis + Photo Processing (Todo)

Build Video Analysis and Photo Processing with Azure Content Understanding integration.

| # | Task | Status |
|---|------|--------|
| 1 | Video models | Todo |
| 2 | File service + video upload | Todo |
| 3 | Video service + Azure Content Understanding | Todo |
| 4 | Video router | Todo |
| 5 | Frontend video API + hooks | Todo |
| 6 | Rewrite VideoAnalysis page | Todo |
| 7 | Rewrite PhotoProcessing page | Todo |
| 8 | Final dashboard stats + tests | Todo |

---

## Post-v1.0

After all 4 phases are complete, new features use **Delta Spec** workflow:
1. `/delta-spec` → brainstorming → new spec file
2. `/plan` → new plan file
3. `/dev` → implementation

Bug fixes use `/bug-fix` → issue tracking in `docs/issues/`.

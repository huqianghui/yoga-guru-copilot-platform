# Dev Onboarding

## Prerequisites

- Python 3.11+
- Node.js 20+
- Git

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/huqianghui/yoga-guru-copilot-platform.git
cd yoga-guru-copilot-platform
```

### 2. Start Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env if you have Azure OpenAI credentials (optional)

# Start the server (DB auto-initializes on first run)
python -m uvicorn app.main:app --reload --port 8000
```

The backend auto-creates tables and seeds data (2 users + 5 Copilots) on first startup. No manual scripts needed.

### 3. Start Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`, proxying `/api` to backend at port 8000.

### 4. Login

Default test accounts:
- `admin` / `admin123`
- `teacher_li` / `teacher123`

## Development Without Azure Credentials

The platform works without Azure credentials. The `MockAgentAdapter` provides simulated AI responses for all 5 Copilots, allowing full development and testing.

## Pre-Commit Checklist

```bash
# Backend
cd backend
python -m pytest tests/ -v

# Frontend
cd frontend
npx tsc -b
npm run build
```

All three checks must pass before committing.

## Docker (Local Testing)

```bash
docker compose up --build
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
```

## Project Structure

See [[Architecture]] for detailed system design.

| Directory | Purpose |
|-----------|---------|
| `frontend/` | React 18 + Vite 6 + Tailwind CSS |
| `backend/` | Python FastAPI + SQLAlchemy |
| `docs/superpowers/specs/` | Product specifications |
| `docs/superpowers/plans/` | Implementation plans |
| `wiki/` | GitHub Wiki source |
| `.github/workflows/` | CI/CD pipelines |

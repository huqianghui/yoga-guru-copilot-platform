# CI/CD Azure Container Apps 部署增强 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善 CI/CD 流水线，确保前后端可靠部署到 Azure Container Apps，包含健康检查、E2E 测试、基础设施脚本。

**Architecture:** 基于现有 GitHub Actions CI 工作流，增加后端健康检查端点、Dockerfile HEALTHCHECK 指令、Playwright E2E 集成、Azure 基础设施部署脚本（az CLI）、和生产环境变量管理。

**Tech Stack:** GitHub Actions, Docker, Azure Container Apps, Azure Container Registry, Playwright, Bicep/az CLI

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/app/routers/health.py` | 健康检查端点 `/api/health` |
| Modify | `backend/app/main.py` | 注册 health router |
| Modify | `backend/Dockerfile` | 添加 HEALTHCHECK 指令 |
| Modify | `frontend/Dockerfile` | 添加 HEALTHCHECK 指令 |
| Modify | `.github/workflows/ci.yml` | 增加 Playwright E2E job，完善 deploy |
| Create | `infra/deploy.sh` | Azure 基础设施创建脚本 |
| Create | `infra/README.md` | 基础设施文档 |
| Modify | `frontend/nginx.conf` | 添加 `/health` 端点 |
| Create | `backend/tests/test_health.py` | 健康检查测试 |

---

## Chunk 1: Health Checks + Docker + CI

### Task 1: Backend Health Check Endpoint

**Files:**
- Create: `backend/app/routers/health.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_health.py
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_health_check_no_auth(client):
    """Health check should not require authentication."""
    resp = await client.get("/api/health")
    assert resp.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest tests/test_health.py -v`
Expected: FAIL with 404 (endpoint doesn't exist)

- [ ] **Step 3: Implement health check router**

```python
# backend/app/routers/health.py
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint for container orchestration."""
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    status = "healthy" if db_ok else "degraded"
    return {
        "status": status,
        "version": "1.0.0",
        "database": "connected" if db_ok else "disconnected",
    }
```

- [ ] **Step 4: Register router in main.py**

Add to `backend/app/main.py` in the router registration section:

```python
from app.routers import auth, users, agents, dashboard, courses, surveys, videos, health

# health router - no prefix, no auth
app.include_router(health.router, prefix="/api", tags=["health"])
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python3 -m pytest tests/test_health.py -v`
Expected: PASS

- [ ] **Step 6: Run all backend tests**

Run: `cd backend && python3 -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/health.py backend/app/main.py backend/tests/test_health.py
git commit -m "feat(backend): add health check endpoint /api/health"
```

---

### Task 2: Update Dockerfiles with HEALTHCHECK

**Files:**
- Modify: `backend/Dockerfile`
- Modify: `frontend/Dockerfile`
- Modify: `frontend/nginx.conf`

- [ ] **Step 1: Add HEALTHCHECK to backend Dockerfile**

Add before CMD in `backend/Dockerfile`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1
```

- [ ] **Step 2: Add nginx health endpoint**

Add to `frontend/nginx.conf` inside the `server` block, before the `location /` block:

```nginx
    location = /health {
        access_log off;
        return 200 '{"status":"healthy"}';
        add_header Content-Type application/json;
    }
```

- [ ] **Step 3: Add HEALTHCHECK to frontend Dockerfile**

Add before EXPOSE in `frontend/Dockerfile`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1
```

- [ ] **Step 4: Test Docker builds locally**

```bash
cd backend && docker build -t yoga-backend:test . && echo "Backend OK"
cd ../frontend && docker build -t yoga-frontend:test . && echo "Frontend OK"
```

Expected: Both build successfully

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile frontend/nginx.conf
git commit -m "feat(docker): add HEALTHCHECK to backend and frontend containers"
```

---

### Task 3: Add Playwright E2E to CI Pipeline

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add e2e-test job to CI workflow**

Add a new job between `frontend-test` and `deploy` in `.github/workflows/ci.yml`:

```yaml
  e2e-test:
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Initialize backend DB
        run: |
          cd backend
          python scripts/init_db.py
          python scripts/seed_data.py

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci

      - name: Install Playwright browsers
        run: |
          cd frontend
          npx playwright install --with-deps chromium

      - name: Run Playwright E2E tests
        run: |
          cd frontend
          npx playwright test --reporter=list
        env:
          CI: true
```

- [ ] **Step 2: Update deploy job to depend on e2e-test**

Change:
```yaml
  deploy:
    needs: [backend-test, frontend-test]
```
To:
```yaml
  deploy:
    needs: [backend-test, frontend-test, e2e-test]
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Playwright E2E tests to CI pipeline"
```

---

### Task 4: Azure Infrastructure Setup Script

**Files:**
- Create: `infra/deploy.sh`
- Create: `infra/README.md`

- [ ] **Step 1: Create infrastructure deploy script**

```bash
# infra/deploy.sh
#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Azure Container Apps Infrastructure Setup
# Usage: ./infra/deploy.sh
# Required: az CLI logged in, subscription selected
# ============================================================

# --- Configuration (override via environment) ---
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-yoga-guru}"
LOCATION="${LOCATION:-eastasia}"
ACR_NAME="${ACR_NAME:-yogaguruacr}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-yoga-guru-env}"
BACKEND_APP_NAME="${BACKEND_APP_NAME:-yoga-guru-backend}"
FRONTEND_APP_NAME="${FRONTEND_APP_NAME:-yoga-guru-frontend}"

echo "=== Creating Resource Group ==="
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo "=== Creating Container Registry ==="
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true

echo "=== Creating Container Apps Environment ==="
az containerapp env create \
  --name "$ENVIRONMENT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "=== Building & Pushing Backend Image ==="
az acr build --registry "$ACR_NAME" --image yoga-guru-backend:latest --file backend/Dockerfile ./backend

echo "=== Building & Pushing Frontend Image ==="
az acr build --registry "$ACR_NAME" --image yoga-guru-frontend:latest --file frontend/Dockerfile ./frontend

ACR_SERVER="${ACR_NAME}.azurecr.io"
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

echo "=== Creating Backend Container App ==="
az containerapp create \
  --name "$BACKEND_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "${ACR_SERVER}/yoga-guru-backend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    DATABASE_URL="sqlite+aiosqlite:///./data/yoga_guru.db" \
    JWT_SECRET="CHANGE-ME-IN-PRODUCTION" \
    DEBUG="false"

BACKEND_FQDN=$(az containerapp show --name "$BACKEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)

echo "=== Creating Frontend Container App ==="
az containerapp create \
  --name "$FRONTEND_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "${ACR_SERVER}/yoga-guru-frontend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    BACKEND_URL="https://${BACKEND_FQDN}"

echo ""
echo "=== Deployment Complete ==="
echo "Backend:  https://${BACKEND_FQDN}"
FRONTEND_FQDN=$(az containerapp show --name "$FRONTEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)
echo "Frontend: https://${FRONTEND_FQDN}"
echo ""
echo "Next steps:"
echo "  1. Set Azure OpenAI env vars: az containerapp update --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP --set-env-vars AZURE_OPENAI_ENDPOINT=... AZURE_OPENAI_KEY=..."
echo "  2. Set JWT_SECRET to a strong random value"
echo "  3. Configure GitHub secrets for CI/CD (see infra/README.md)"
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x infra/deploy.sh
```

- [ ] **Step 3: Create infrastructure README**

```markdown
# infra/README.md
# Azure Infrastructure

## Prerequisites

- Azure CLI (`az`) installed and logged in
- Azure subscription with Container Apps enabled

## First-Time Setup

```bash
# Login to Azure
az login

# Run infrastructure setup
./infra/deploy.sh
```

## Environment Variables

### Backend Container App

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLAlchemy connection string |
| `JWT_SECRET` | Yes | JWT signing secret (use strong random value) |
| `DEBUG` | No | Enable debug mode (default: false) |
| `AZURE_OPENAI_ENDPOINT` | No | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_KEY` | No | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | No | Model deployment name (default: gpt-4o) |
| `AZURE_CU_ENDPOINT` | No | Azure Content Understanding endpoint |
| `AZURE_CU_KEY` | No | Azure Content Understanding key |

### Frontend Container App

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` | Yes | Backend FQDN (auto-set by deploy script) |

## Update Environment Variables

```bash
az containerapp update \
  --name yoga-guru-backend \
  --resource-group rg-yoga-guru \
  --set-env-vars \
    AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/" \
    AZURE_OPENAI_KEY="your-key"
```

## GitHub Actions Secrets

Configure these in repository Settings → Secrets:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Azure AD app registration client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

And repository Variables:

| Variable | Description |
|----------|-------------|
| `ACR_NAME` | Container Registry name (e.g., `yogaguruacr`) |
| `RESOURCE_GROUP` | Resource group name (e.g., `rg-yoga-guru`) |

## Manual Deployment

```bash
# Build and push images
az acr build --registry yogaguruacr --image yoga-guru-backend:v1.0 --file backend/Dockerfile ./backend
az acr build --registry yogaguruacr --image yoga-guru-frontend:v1.0 --file frontend/Dockerfile ./frontend

# Update container apps
az containerapp update --name yoga-guru-backend --resource-group rg-yoga-guru --image yogaguruacr.azurecr.io/yoga-guru-backend:v1.0
az containerapp update --name yoga-guru-frontend --resource-group rg-yoga-guru --image yogaguruacr.azurecr.io/yoga-guru-frontend:v1.0
```
```

- [ ] **Step 4: Commit**

```bash
git add infra/
git commit -m "feat(infra): add Azure Container Apps deployment script and docs"
```

---

### Task 5: Production Environment Configuration

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add environment variable injection to deploy job**

Update the backend deploy step in `.github/workflows/ci.yml` to pass Azure service secrets:

```yaml
      - name: Deploy backend
        run: |
          az containerapp update \
            --name yoga-guru-backend \
            --resource-group ${{ vars.RESOURCE_GROUP }} \
            --image ${{ vars.ACR_NAME }}.azurecr.io/yoga-guru-backend:${{ github.sha }} \
            --set-env-vars \
              DEBUG="false" \
              JWT_SECRET="${{ secrets.JWT_SECRET }}" \
              AZURE_OPENAI_ENDPOINT="${{ secrets.AZURE_OPENAI_ENDPOINT }}" \
              AZURE_OPENAI_KEY="${{ secrets.AZURE_OPENAI_KEY }}" \
              AZURE_OPENAI_DEPLOYMENT="${{ vars.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o' }}" \
              AZURE_CU_ENDPOINT="${{ secrets.AZURE_CU_ENDPOINT }}" \
              AZURE_CU_KEY="${{ secrets.AZURE_CU_KEY }}"
```

- [ ] **Step 2: Add health check verification after deploy**

Add after both deploy steps:

```yaml
      - name: Verify backend health
        run: |
          BACKEND_FQDN=$(az containerapp show \
            --name yoga-guru-backend \
            --resource-group ${{ vars.RESOURCE_GROUP }} \
            --query "properties.configuration.ingress.fqdn" -o tsv)
          for i in {1..10}; do
            if curl -sf "https://${BACKEND_FQDN}/api/health" | grep -q '"status"'; then
              echo "Backend is healthy"
              exit 0
            fi
            echo "Waiting for backend... (attempt $i/10)"
            sleep 10
          done
          echo "Backend health check failed"
          exit 1
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add production env vars and health verification to deploy"
```

- [ ] **Step 4: Push all changes**

```bash
git push origin main
```

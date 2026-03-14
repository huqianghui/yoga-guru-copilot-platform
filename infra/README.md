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

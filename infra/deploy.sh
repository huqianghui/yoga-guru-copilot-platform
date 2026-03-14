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

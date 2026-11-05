#!/usr/bin/env bash
# Bring up Postgres + Document Engine + backend on the local (OrbStack) Kubernetes cluster.
#
# Optional env vars:
#   ACTIVATION_KEY     Nutrient Document Engine activation key (omit for trial mode)
#   ANTHROPIC_API_KEY  enables AI text cleanup in the backend
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NS=text-extract
KEYS="$ROOT/server/keys"
STATE="$ROOT/k8s/.local-secrets"   # gitignored; keeps generated secrets stable across runs

# 1. JWT key pair (backend signs with private, DE verifies with public)
mkdir -p "$KEYS"
if [[ ! -f "$KEYS/private_key.pem" ]]; then
  echo "Generating JWT key pair in server/keys/"
  openssl genpkey -algorithm RSA -out "$KEYS/private_key.pem" -pkeyopt rsa_keygen_bits:2048 2>/dev/null
  openssl rsa -pubout -in "$KEYS/private_key.pem" -out "$KEYS/public_key.pem" 2>/dev/null
fi

# 2. Generated secrets (created once, reused)
if [[ ! -f "$STATE" ]]; then
  {
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
    echo "API_AUTH_TOKEN=$(openssl rand -hex 24)"
    echo "SECRET_KEY_BASE=$(openssl rand -hex 64)"
    echo "DASHBOARD_PASSWORD=$(openssl rand -hex 12)"
  } > "$STATE"
  chmod 600 "$STATE"
fi
# shellcheck disable=SC1090
source "$STATE"

kubectl apply -f "$ROOT/k8s/namespace.yaml"

kubectl -n "$NS" create secret generic text-extract-secrets \
  --from-literal=postgres-password="$POSTGRES_PASSWORD" \
  --from-literal=api-auth-token="$API_AUTH_TOKEN" \
  --from-literal=secret-key-base="$SECRET_KEY_BASE" \
  --from-literal=dashboard-password="$DASHBOARD_PASSWORD" \
  --from-literal=activation-key="${ACTIVATION_KEY:-}" \
  --from-literal=anthropic-api-key="${ANTHROPIC_API_KEY:-}" \
  --from-file=jwt-public-key="$KEYS/public_key.pem" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NS" create secret generic text-extract-jwt \
  --from-file=private_key.pem="$KEYS/private_key.pem" \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Build backend image into OrbStack's shared image store
docker build -t text-extract-backend:dev "$ROOT/server"

# 4. Deploy
kubectl apply -k "$ROOT/k8s"
kubectl -n "$NS" rollout restart deployment/backend >/dev/null
kubectl -n "$NS" rollout status deployment/postgres --timeout=120s
kubectl -n "$NS" rollout status deployment/document-engine --timeout=300s
kubectl -n "$NS" rollout status deployment/backend --timeout=120s

cat <<MSG

Ready.
  Backend:          http://localhost:3001/health
  Document Engine:  http://localhost:5000/dashboard  (user: dashboard / pass: $DASHBOARD_PASSWORD)
Frontend:           pnpm dev  ->  http://localhost:5173
MSG

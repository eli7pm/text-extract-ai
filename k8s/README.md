# Local stack on OrbStack Kubernetes

Runs everything the frontend needs on your machine — no ngrok:

| Component        | In-cluster address            | From your Mac              |
|------------------|-------------------------------|----------------------------|
| Postgres         | `postgres:5432`               | —                          |
| Document Engine  | `document-engine:5000`        | http://localhost:5000      |
| Backend (Express)| `backend:3001`                | http://localhost:3001      |

OrbStack publishes `LoadBalancer` services on `localhost`, and its Kubernetes shares the Docker
image store, so the backend image is built locally and used without a registry.

## Prerequisites

- [OrbStack](https://orbstack.dev) with Kubernetes enabled (`kubectl config use-context orbstack`)
- `docker`, `kubectl`, `openssl`

## Up

```bash
# Optional: ACTIVATION_KEY=<nutrient key>  (omit for trial mode)
# Optional: ANTHROPIC_API_KEY=<key>        (enables AI text cleanup)
./k8s/up.sh

pnpm install
pnpm dev            # http://localhost:5173
```

`up.sh` is idempotent. It:
1. generates the JWT key pair in `server/keys/` (backend signs, Document Engine verifies),
2. generates DB/API/dashboard secrets once into `k8s/.local-secrets` (gitignored),
3. creates the `text-extract-secrets` and `text-extract-jwt` Kubernetes secrets,
4. builds `text-extract-backend:dev` and applies the manifests with `kubectl apply -k k8s`.

Re-run it after changing `server/` to rebuild and restart the backend.

## Why two Document Engine URLs?

The backend calls Document Engine over cluster DNS (`DOCUMENT_ENGINE_URL=http://document-engine:5000`),
but the Nutrient viewer in the browser connects to Document Engine directly using the URL the backend
returns (`DOCUMENT_ENGINE_PUBLIC_URL=http://localhost:5000`). If you expose the stack publicly,
change `DOCUMENT_ENGINE_PUBLIC_URL` and `CORS_ORIGINS` in `backend.yaml`.

## Useful commands

```bash
kubectl -n text-extract get pods
kubectl -n text-extract logs deploy/backend -f
kubectl -n text-extract logs deploy/document-engine -f
./k8s/down.sh       # deletes the namespace, including stored documents
```

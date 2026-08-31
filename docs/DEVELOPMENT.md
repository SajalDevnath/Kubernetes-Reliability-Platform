# Development Guide

> **Current Milestone:** Milestone 7 — Metrics and Monitoring (next). Milestone 6 — CI/CD is complete.

This document describes the development workflow for the Kubernetes Reliability Platform.

## Development Philosophy

- Work incrementally, one milestone at a time
- Keep implementations simple — the goal is learning, not complexity
- Test and verify every change before considering it complete
- Update documentation when implementation changes require it
- Do not introduce technologies before their milestone

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (`python -m uv` if installed via pip)
- Git
- PostgreSQL (required for integration connectivity tests; optional for unit tests when not using Docker Compose)
- Docker and Docker Compose (required for the containerized local stack — Milestone 3)

## Python Development Workflow

1. Use `uv` for dependency and environment management
2. Application code lives under `services/<service_name>/`
3. Use type hints and follow coding standards in `.cursor/rules/coding-style.mdc`
4. Structure code with clear separation: routers, schemas, core/config (services/repositories added when needed)

## Local Setup

```bash
# Install dependencies (creates .venv automatically)
python -m uv sync --dev

# Copy environment template and adjust if needed
cp .env.example .env
```

## Running the User Service

```bash
# Start the FastAPI application
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir services/user_service

# Verify health endpoint
curl http://127.0.0.1:8001/health
```

Expected response:

```json
{"status":"ok","service":"user-service","environment":"development"}
```

API documentation is available at `http://127.0.0.1:8001/docs` when the service is running.

### User CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/users` | Create a user |
| `GET` | `/users` | List users (supports `skip` and `limit`) |
| `GET` | `/users/{user_id}` | Get a user by ID |
| `PATCH` | `/users/{user_id}` | Update a user |
| `DELETE` | `/users/{user_id}` | Delete a user |

Example:

```bash
curl -X POST http://127.0.0.1:8001/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","full_name":"Test User"}'
```

## Running the Order Service

```bash
# Start the FastAPI application
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8002 --app-dir services/order_service

# Verify API documentation
curl http://127.0.0.1:8002/docs
```

API documentation is available at `http://127.0.0.1:8002/docs` when the service is running.

### Order CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/orders` | Create an order |
| `GET` | `/orders` | List orders (supports `skip` and `limit`) |
| `GET` | `/orders/{order_id}` | Get an order by ID |
| `PATCH` | `/orders/{order_id}` | Update an order |
| `DELETE` | `/orders/{order_id}` | Delete an order |

Example:

```bash
curl -X POST http://127.0.0.1:8002/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"total_amount":"49.99"}'
```

Order creation synchronously calls Payment Service (`POST /payments`) using `PAYMENT_SERVICE_URL` (default `http://127.0.0.1:8003`). Payment Service must be running for order creation to succeed.

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_SERVICE_URL` | `http://127.0.0.1:8003` | Payment Service base URL (Order Service) |
| `PAYMENT_SERVICE_TIMEOUT_SECONDS` | `5.0` | HTTP timeout for Payment Service calls |

## Running the Payment Service

```bash
# Start the FastAPI application
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8003 --app-dir services/payment_service

# Verify health endpoint
curl http://127.0.0.1:8003/health
```

Expected response:

```json
{"status":"ok","service":"payment-service","environment":"development"}
```

API documentation is available at `http://127.0.0.1:8003/docs` when the service is running.

### Payment CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/payments` | Create a payment |
| `GET` | `/payments` | List payments (supports `skip` and `limit`) |
| `GET` | `/payments/{payment_id}` | Get a payment by ID |
| `PATCH` | `/payments/{payment_id}` | Update a payment |
| `DELETE` | `/payments/{payment_id}` | Delete a payment |

Example:

```bash
curl -X POST http://127.0.0.1:8003/payments \
  -H "Content-Type: application/json" \
  -d '{"order_id":1,"amount":"49.99"}'
```

### Payment Status Transitions

New payments default to `pending`. Allowed transitions:

- `pending` → `successful`
- `pending` → `failed`

Terminal states (`successful`, `failed`) cannot be updated. Amount changes are allowed only while `pending`.

Payment status updates are owned by Payment Service. Updating a payment to `successful` does **not** automatically change the associated order's status in Order Service.

## Docker Compose Workflow

The containerized local stack is defined in `docker-compose.yml` at the repository root. It runs PostgreSQL 16 and all three application services on the `krp-network` Compose network.

| Service | Host port | Container healthcheck |
|---------|-----------|------------------------|
| `postgres` | (internal only) | `pg_isready` |
| `user-service` | 8001 | `GET /health` |
| `order-service` | 8002 | `GET /orders` (Order Service has no `/health` endpoint) |
| `payment-service` | 8003 | `GET /health` |

Application services connect to PostgreSQL using `POSTGRES_HOST=postgres`. Order Service reaches Payment Service using `PAYMENT_SERVICE_URL=http://payment-service:8003` (Compose service name, not `127.0.0.1`).

### Build and run

```bash
# Validate Compose configuration
docker compose config

# Build application images
docker compose build

# Start the full stack in the background
docker compose up -d

# Inspect service status
docker compose ps

# View logs
docker compose logs --no-color
```

### Verify from the host

```bash
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8003/health
curl http://127.0.0.1:8002/orders
```

Expected health responses include `"status":"ok"` with `"service":"user-service"` or `"service":"payment-service"`.

### Stop the stack

```bash
# Stop containers but preserve the PostgreSQL volume
docker compose down
```

Use `docker compose down -v` only when you intentionally want to remove the named PostgreSQL volume.

The pytest suite (`tests/unit`, `tests/integration`, `tests/e2e`) continues to run against host PostgreSQL via `.env` / `.env.example` defaults and does not require the Compose or Kubernetes stack to be running.

## Kubernetes Workflow

The Kubernetes local stack is defined by plain YAML manifests under `k8s/`. It deploys PostgreSQL and all three application services to a kind cluster.

| Setting | Value |
|---------|-------|
| kind cluster | `krp` |
| kubectl context | `kind-krp` |
| Namespace | `krp` (must exist before applying manifests) |

**Prerequisites:** kind and kubectl (see Future Prerequisites table below).

**Apply order:**

1. PostgreSQL — PVC, Secret, Deployment, Service (`k8s/postgres/`)
2. Wait for PostgreSQL readiness
3. Application services — payment-service, user-service, order-service (`k8s/payment-service/`, `k8s/user-service/`, `k8s/order-service/`)

Build application images from the repository root, load them into kind with `kind load docker-image`, then apply manifests. Order Service reaches Payment Service at `http://payment-service:8003` via Kubernetes Service DNS.

See [k8s/README.md](../k8s/README.md) for build, load, apply, verify, and teardown commands.

## Helm Workflow

The Helm chart at `helm/krp/` packages the same application topology as the `k8s/` manifests. Use Helm for install, upgrade, and release management on the kind cluster.

| Setting | Value |
|---------|-------|
| Chart | `helm/krp/` (`krp-0.1.0`) |
| Release name | `krp` |
| Namespace | `krp` (must exist; chart does not create it by default) |
| Values files | `values.yaml` (baseline), `values-local.yaml` (local kind overrides) |

**Prerequisites:** Helm 3 or 4 (see Future Prerequisites table below).

**M4 → M5 migration:** Before the first Helm install on a cluster that already has M4 resources, remove M4 Deployments, Services, ConfigMaps, and the Secret while **preserving** the PostgreSQL PVC `postgres-data`. Set `postgres.storage.existingClaim: postgres-data` in `values-local.yaml` so Helm reuses the existing PVC and does not render a new one.

**Install or upgrade:**

```bash
helm lint helm/krp
helm template krp helm/krp
helm template krp helm/krp -f helm/krp/values-local.yaml

helm upgrade --install krp helm/krp \
  --namespace krp \
  --create-namespace=false \
  -f helm/krp/values.yaml \
  -f helm/krp/values-local.yaml
```

**Verify release:**

```bash
helm list -n krp
helm history krp -n krp
kubectl get pods,svc -n krp
```

Override configuration at upgrade time (example):

```bash
helm upgrade krp helm/krp -n krp \
  -f helm/krp/values.yaml \
  -f helm/krp/values-local.yaml \
  --set userService.replicas=2
```

See [helm/krp/README.md](../helm/krp/README.md) for build, load, install, upgrade, rollback, teardown, and PVC reuse details.

## CI/CD Workflow

GitHub Actions automates build, test, and deployment validation. Workflows live under `.github/workflows/`.

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `ci.yml` | `pull_request` | Lint, test, build validation, Helm validation |
| CD | `cd.yml` | `push` to `main` | Ephemeral kind deploy and smoke tests |

Both workflows use `permissions: contents: read` only.

### CI workflow (pull requests)

Runs on `ubuntu-latest` with:

1. **Checkout** and Python 3.10 setup
2. **uv** — `uv sync --dev --frozen`
3. **Ruff** — `uv run ruff check services tests`
4. **pytest** — `uv run pytest tests/ -v` (full 124-test suite)
5. **PostgreSQL 16** — GitHub Actions service container (`app_user` / `change_me` / `k8s_reliability` on port 5432)
6. **Docker builds** — `krp-user-service:ci`, `krp-order-service:ci`, `krp-payment-service:ci` (validation only; no push)
7. **Helm** — `helm lint helm/krp`; `helm template krp helm/krp` (output discarded to avoid logging Secret values)

### CD workflow (push to main)

Runs on `ubuntu-latest` with an **ephemeral** kind cluster created on the GitHub-hosted runner. CD does **not** deploy to a developer's local `kind-krp` cluster and is **not** a production deployment.

1. **Checkout** and Docker Buildx setup
2. **Docker builds** — three `krp-*-service:ci` images
3. **kind v0.33.0** — installed from the official release URL
4. **Ephemeral cluster** — `kind create cluster --name krp`
5. **Namespace** — `kubectl create namespace krp`
6. **Image load** — `kind load docker-image` for all three `:ci` images (`imagePullPolicy: Never` compatible)
7. **Helm** — lint, template, then:

```bash
helm upgrade --install krp helm/krp \
  --namespace krp \
  --create-namespace=false \
  -f helm/krp/values.yaml \
  --set images.userService.tag=ci \
  --set images.orderService.tag=ci \
  --set images.paymentService.tag=ci
```

Uses `values.yaml` only — **not** `values-local.yaml` (which assumes a pre-existing local PVC).

8. **Readiness** — `kubectl wait` for postgres, user-service, payment-service, order-service (180s each)
9. **Smoke tests** — temporary `curlimages/curl:8.10.1` pod; in-cluster HTTP checks:
   - `http://user-service:8001/health`
   - `http://payment-service:8003/health`
   - `http://order-service:8002/orders`
10. **Cleanup** — `kind delete cluster --name krp` with `if: always()`

### Credential handling in CI/CD

- CI/CD credential handling was reviewed and documented; no GitHub Secrets or dedicated secrets-management mechanism was implemented
- No GitHub Secrets are required for the current implementation
- PostgreSQL uses the documented local-development placeholder (`change_me`) — not a production credential
- No container registry credentials; images are built on the runner and loaded into kind
- Workflows do not log rendered Helm Secret values or kubectl secret contents

### Local parity

Local commands mirror CI/CD validation steps. For CD simulation on a developer machine, use a **separate** kind cluster name (e.g. `krp-cd-test`) to avoid affecting the persistent local `krp` cluster. See Milestone 6 verification notes in `docs/TESTING.md`.

## FastAPI Development Workflow

1. Define Pydantic schemas for request/response models
2. Implement business logic in service layer (when introduced)
3. Wire endpoints in FastAPI routers
4. Use dependency injection for configuration and database sessions via `get_db`
5. Test endpoints with pytest and FastAPI TestClient

## Running Tests

```bash
# Run all unit tests
python -m uv run pytest tests/unit -v

# Run PostgreSQL integration tests (requires running PostgreSQL)
python -m uv run pytest tests/integration -v -m integration

# Run end-to-end cross-service workflow tests (requires running PostgreSQL)
python -m uv run pytest tests/e2e -v -m e2e
```

Integration and E2E tests use `POSTGRES_*` variables from `.env` (or defaults in `.env.example`). PostgreSQL must be running for integration and E2E tests to execute.

## Database Configuration

PostgreSQL settings are loaded from environment variables:

| Variable | Default |
|----------|---------|
| `POSTGRES_HOST` | `localhost` |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_DB` | `k8s_reliability` |
| `POSTGRES_USER` | `app_user` |
| `POSTGRES_PASSWORD` | `change_me` |

Alternatively, set `DATABASE_URL` to override the component-based connection string.

Connectivity can be verified programmatically via `app.db.database.check_database_connection()`.

## Local Development Philosophy

- The entire platform runs locally
- No AWS or cloud dependencies for core implementation
- Use kind for local Kubernetes clusters (Milestone 4 — implemented; see Kubernetes Workflow above)
- Use Helm for parameterized Kubernetes deployment (Milestone 5 — implemented; see Helm Workflow above)
- Use GitHub Actions for automated CI/CD (Milestone 6 — implemented; see CI/CD Workflow above)
- Use Docker Compose for local multi-service development (Milestone 3 — implemented; see Docker Compose Workflow above)

## Cursor Workflow

When working with Cursor AI:

1. Identify the current milestone and task from `docs/ROADMAP.md`
2. Read relevant documentation before making changes
3. Follow `PROJECT_MASTER_SPECIFICATION.md` and `AGENTS.md`
4. Implement only the requested task — do not jump ahead
5. Test and verify changes
6. Review Git changes before requesting commit authorization

See `AGENTS.md` for the complete AI assistant operating model.

## Git Workflow

1. Work on focused branches per milestone or task
2. Keep commits small and focused
3. Use conventional commit messages (see `.cursor/rules/git.mdc`)
4. Never commit secrets or generated artifacts
5. Request authorization before committing

## Testing Workflow

1. Write tests alongside implementation
2. Run unit tests for every code change
3. Run integration tests when services interact (Milestone 2+)
4. Run end-to-end tests for full request flows (Milestone 2+)
5. Report test results before requesting commit authorization

See `docs/TESTING.md` for the full testing strategy.

## Documentation Workflow

1. Update relevant docs when implementation changes architecture or behavior
2. Mark unimplemented features as "Planned"
3. Record architectural decisions in `docs/DECISIONS.md`
4. Keep the roadmap status current in `docs/ROADMAP.md`

## Milestone Workflow

For each milestone:

1. Read the milestone objective and tasks in `docs/ROADMAP.md`
2. Create an implementation plan in `.cursor/plans/` if needed
3. Implement tasks incrementally
4. Test and verify each task
5. Update documentation
6. Mark milestone tasks complete in the roadmap
7. Request commit authorization with changed files and test results

## Future Prerequisites (by milestone)

| Milestone | Tools Required |
|-----------|---------------|
| 2 | PostgreSQL (for service + database integration) |
| 3 | Docker, Docker Compose |
| 4 | kind, kubectl |
| 5 | Helm |
| 6 | GitHub Actions (cloud) |
| 7–10 | Prometheus, Grafana, Alertmanager, Loki, OpenTelemetry |
| 14–17 | LLM API access |

Do not install future prerequisites until their milestone begins.

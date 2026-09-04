# Testing Strategy

> **Status:** Milestone 8 complete — manual E2E alerting verification on kind cluster `krp` (critical and warning paths). Application metrics tests (15 passing, included in 101 unit tests), Prometheus/Grafana local verification, CD monitoring smoke checks, and GitHub Actions CD end-to-end verification with monitoring checks **PASSED** (commit `34f919b`, `feat: add metrics and monitoring`). **139 tests passing** (101 unit, 36 integration, 2 E2E; M8 added no automated tests).

## Philosophy

A task is not complete merely because the application starts. Every change must be tested and verified before it is considered done.

## Test Levels

### Unit Tests (Milestone 2 — User, Order, and Payment services complete)

- **Scope:** Individual functions, classes, API endpoint behavior, schemas, repository, and service logic
- **Location:** `tests/unit/`
- **Tools:** pytest, FastAPI TestClient, httpx, SQLite (repository tests)
- **Status:** Complete for User Service (30 tests), Order Service (37 tests), and Payment Service (34 tests) — 101 unit tests passing

### Integration Tests (Milestone 2 — User, Order, and Payment services complete)

- **Scope:** Live PostgreSQL connectivity and User/Order/Payment CRUD API flows
- **Location:** `tests/integration/`
- **Tools:** pytest, SQLAlchemy, FastAPI TestClient
- **Status:** Complete for User Service (9 tests), Order Service (14 tests), Payment Service (12 tests), and database connectivity (1 test) — 36 integration tests passing against PostgreSQL

### End-to-End Tests (Milestone 2 — cross-service workflows complete)

- **Scope:** Full request flows across User, Order, and Payment services
- **Location:** `tests/e2e/`
- **Example:** Create user → create order → verify payment → process payment
- **Status:** Complete — 2 E2E tests passing against PostgreSQL

### Container Tests (Milestone 3 — Docker Compose verification complete)

- **Scope:** Docker image builds, container startup, Compose orchestration, container health checks, Compose network communication
- **Location:** Manual verification against `docker-compose.yml` (automated container tests not yet in `tests/`)
- **Status:** Verified — all three service images build; `docker compose up` brings up postgres, user-service, order-service, and payment-service on `krp-network`
- **Verified checks:**
  - `docker compose config` and `docker compose build` succeed
  - PostgreSQL healthy via `pg_isready`
  - User Service `/health` and Payment Service `/health` return HTTP 200 in containers
  - Order Service `GET /orders` returns HTTP 200 (no `/health` endpoint)
  - Order container reaches Payment at `http://payment-service:8003/health` over Compose DNS
  - Host-mapped User → Order → Payment workflow exercised through Compose containers
  - PostgreSQL data persists across application container restarts (`docker compose down` without `-v`)
  - Existing pytest suite unchanged: 86 unit + 36 integration + 2 E2E = **124 passing**

### Kubernetes Tests (Milestone 4 — manual verification complete)

- **Scope:** Deployment health, probe behavior, service discovery, in-cluster Order → Payment workflow
- **Location:** Manual verification against `k8s/` manifests (automated Kubernetes tests not in `tests/`)
- **Status:** Verified — all four workloads deploy to kind cluster `krp` (namespace `krp`) and reach Ready
- **Verified checks:**
  - PostgreSQL Deployment with PVC `postgres-data` (1Gi) healthy via `pg_isready`
  - User Service `/health` and Payment Service `/health` return HTTP 200 in cluster
  - Order Service `GET /orders` returns HTTP 200 (no `/health` endpoint)
  - ConfigMaps and `postgres-credentials` Secret externalize configuration
  - In-cluster DNS resolves `user-service`, `order-service`, `payment-service`, `postgres`
  - User creation, order creation, and payment record creation verified in-cluster
  - Order → Payment communication via `http://payment-service:8003` verified
  - Existing pytest suite unchanged: 86 unit + 36 integration + 2 E2E = **124 passing**
  - Docker Compose parity verified after Kubernetes work

### Helm Tests (Milestone 5 — manual verification complete)

- **Scope:** Chart linting, template rendering, Helm install/upgrade, release history, PVC reuse during M4 → M5 migration, in-cluster and API workflow verification
- **Location:** Manual verification against `helm/krp/` chart (automated Helm tests not in `tests/`)
- **Status:** Verified — release `krp` deployed to kind cluster `krp` (namespace `krp`) via `helm upgrade --install`
- **Verified checks:**
  - `helm lint helm/krp` — 0 chart(s) failed
  - `helm template krp helm/krp` renders PostgreSQL PVC `postgres-data`
  - `helm template krp helm/krp -f helm/krp/values-local.yaml` skips PVC creation; Deployment uses `claimName: postgres-data`
  - M4 application resources removed before install; existing PVC `postgres-data` preserved (Bound, 1Gi)
  - Helm install (revision 1) and upgrades verified (revision 2: `userService.replicas=2` → `2/2`; revision 3: restored to `1/1`)
  - All four workloads Running after stabilization; PostgreSQL 0 restarts
  - In-cluster HTTP checks: User `/health`, Payment `/health`, Order `/orders` return HTTP 200
  - API workflow via port-forward: order creation (ID 3) and payment creation (ID 4); M4 data (orders 1–2, payments 1–3) retained
  - Plain `k8s/` manifests retained as M4 reference (not removed from repository)

### CI/CD Tests (Milestone 6 — GitHub Actions verification complete)

- **Scope:** Automated CI on pull requests; automated CD on pushes to `main`; ephemeral kind deployment; in-cluster smoke tests
- **Location:** `.github/workflows/ci.yml`, `.github/workflows/cd.yml` (not in `tests/`)
- **Status:** Verified — GitHub Actions CI and CD workflows passed on GitHub
- **CI verified checks:**
  - Trigger: `pull_request`
  - Python 3.10, `uv sync --dev --frozen`, Ruff lint passes
  - Full pytest suite: **124 passed** with PostgreSQL 16 service container
  - Docker build validation for `krp-user-service:ci`, `krp-order-service:ci`, `krp-payment-service:ci`
  - `helm lint helm/krp` — 0 chart(s) failed; `helm template` succeeds
- **CD verified checks:**
  - Trigger: `push` to `main`
  - Ephemeral kind cluster `krp` created on GitHub-hosted runner (not developer local cluster)
  - kind v0.33.0; three `:ci` images loaded via `kind load docker-image`
  - Helm deploy with `values.yaml` and `--set images.*.tag=ci` into namespace `krp`
  - All four deployments reach Available (`kubectl wait`)
  - In-cluster smoke tests: User `/health`, Payment `/health`, Order `/orders` return HTTP 200
  - `kind delete cluster --name krp` runs with `if: always()`
  - No container registry push; no production deployment
- **CD M7 extensions (verified):**
  - `kubectl wait` for prometheus and grafana deployments
  - In-cluster monitoring smoke tests: Prometheus `/-/ready`, Grafana `/api/health`, `/metrics` on all three services, Prometheus targets UP (bounded retry)
  - GitHub Actions CD end-to-end verification **PASSED** (commit `34f919b`, `feat: add metrics and monitoring`)

### Observability Verification (Milestone 7 — complete)

- **Scope:** `/metrics` endpoint behavior, Prometheus scrape targets, Grafana datasource and dashboard, CD monitoring smoke checks
- **Location:** `tests/unit/test_metrics.py`, `tests/unit/order_service/test_order_metrics.py`, `tests/unit/payment_service/test_payment_metrics.py`; manual verification against `helm/krp/` on kind; CD workflow smoke tests
- **Status:** Complete — metrics unit tests pass (15 tests, included in 101 unit tests); Prometheus targets UP; Grafana **KRP Service Health** dashboard panels return data; CD monitoring smoke checks verified locally and via GitHub Actions CD (commit `34f919b`)
- **Verified checks:**
  - `GET /metrics` returns HTTP 200 with Prometheus text format
  - Metrics include `http_requests_total` and `http_request_duration_seconds`
  - Handler label uses FastAPI route template (not raw URL path)
  - `/metrics` endpoint excluded from request counters
  - Prometheus scrapes user-service, order-service, payment-service (static Service DNS)
  - Grafana datasource provisioned at `http://prometheus:9090`
  - Dashboard UID `krp-services` provisioned with documented PromQL queries

### Alerting Verification (Milestone 8 — complete)

- **Scope:** Prometheus alert rule evaluation, Alertmanager alert receipt and routing, alert firing and resolution
- **Location:** Manual verification against `helm/krp/` on kind cluster `krp` (no automated alert tests in `tests/`; CD workflow unchanged)
- **Status:** Complete — manual in-cluster E2E verification for both approved alert rules; **139 tests** unchanged (M8 added no automated tests)
- **Verified checks:**
  - Alertmanager deployed and Ready (`prom/alertmanager:v0.27.0`, port 9093, `emptyDir` storage)
  - Prometheus → Alertmanager integration (`alertmanager:9093`)
  - Prometheus rules loaded from `prometheus-rules` ConfigMap (`KRPServiceTargetDown`, `KRPHigh5xxErrorRate`)
  - **`KRPServiceTargetDown` (critical):** `user-service` scaled to 0 → inactive → pending → firing (`for: 1m`) → Alertmanager `critical` receiver → resolved on scale-up
  - **`KRPHigh5xxErrorRate` (warning):** `payment-service` scaled to 0 + sustained in-cluster `POST /orders` traffic → measured ~71% 5xx ratio for `order-service` → inactive → pending → firing (`for: 2m`) → Alertmanager `warning` receiver (`service=order-service`) → resolved after payment restore
  - Receivers are local/null only — no external notification integrations verified (none configured)
  - CD workflow unchanged — no Alertmanager smoke checks added

### Failure Simulation Tests (Planned — Milestone 12)

- **Scope:** Network failures, latency injection, dependency failures
- **Purpose:** Verify observability captures failure symptoms
- **Status:** Planned

### Observability Verification — Logging and Tracing (Planned — Milestones 9–10)

- **Scope:** Logs in Loki, traces in OpenTelemetry
- **Purpose:** Confirm instrumentation is correct
- **Status:** Planned

### AI Testing (Planned — Milestones 14–17)

- **Scope:** Prompt quality, tool calling accuracy, RAG retrieval, safety guardrails
- **Purpose:** Ensure AI recommendations are safe and useful
- **Status:** Planned

## Test Execution

| When | What to Run |
|------|-------------|
| Every code change | Relevant unit tests |
| Service integration | Integration tests |
| Before commit | Full test suite for changed area |
| Milestone completion | All tests for that milestone; Milestone 3 requires Compose stack verification; Milestone 4 requires kind stack verification; Milestone 5 requires Helm deployment verification; Milestone 6 requires GitHub Actions CI and CD workflow verification |

## Currently Available Tests

| Test File | Coverage |
|-----------|----------|
| `tests/unit/test_metrics.py` | User Service `/metrics` endpoint, content type, metric names, route template labels |
| `tests/unit/order_service/test_order_metrics.py` | Order Service metrics instrumentation |
| `tests/unit/payment_service/test_payment_metrics.py` | Payment Service metrics instrumentation |
| `tests/unit/test_health.py` | `GET /health` status code, response body, schema shape |
| `tests/unit/test_database_config.py` | PostgreSQL URL construction and settings defaults |
| `tests/unit/test_database.py` | SQLAlchemy engine, session factory, `get_db`, declarative Base |
| `tests/unit/test_user_schemas.py` | User Pydantic schema validation |
| `tests/unit/test_user_repository.py` | User repository CRUD (SQLite) |
| `tests/unit/test_user_service.py` | User service business logic and error handling |
| `tests/unit/order_service/test_order_foundation.py` | Order model, schemas, and metadata |
| `tests/unit/order_service/test_order_repository.py` | Order repository CRUD (SQLite) |
| `tests/unit/order_service/test_order_service.py` | Order service business logic and error handling |
| `tests/unit/payment_service/test_payment_foundation.py` | Payment model, schemas, and metadata |
| `tests/unit/payment_service/test_payment_repository.py` | Payment repository CRUD (SQLite) |
| `tests/unit/payment_service/test_payment_service.py` | Payment service business logic and error handling |
| `tests/integration/test_database_connectivity.py` | Live PostgreSQL connectivity (`SELECT 1`) |
| `tests/integration/test_users_api.py` | User CRUD API against PostgreSQL |
| `tests/unit/order_service/test_payment_client.py` | Payment Service HTTP client behavior |
| `tests/integration/order_service/test_orders_api.py` | Order CRUD API and Order → Payment integration against PostgreSQL |
| `tests/integration/payment_service/test_payments_api.py` | Payment CRUD API against PostgreSQL |
| `tests/e2e/test_user_order_payment_workflow.py` | User → Order → Payment cross-service workflow and payment processing |

Run with:

```bash
python -m uv run pytest tests/unit -v
python -m uv run pytest tests/integration -v -m integration
python -m uv run pytest tests/e2e -v -m e2e
```

## Test Directory Structure

```
tests/
├── unit/                          # Unit tests (101 passing)
│   ├── order_service/             # Order Service unit tests (37 passing)
│   └── payment_service/           # Payment Service unit tests (34 passing)
├── integration/                   # PostgreSQL + API tests (36 passing)
│   ├── order_service/             # Order Service integration tests (14 passing)
│   └── payment_service/           # Payment Service integration tests (12 passing)
└── e2e/                           # End-to-end cross-service tests (2 passing)
```

**Verified totals:** 101 unit + 36 integration + 2 E2E = **139 tests passing**.

## Quality Gates

Before a milestone is marked complete:

1. All tests for that milestone pass
2. No regressions in previously passing tests
3. Test results are reported before commit authorization
4. New functionality has corresponding test coverage

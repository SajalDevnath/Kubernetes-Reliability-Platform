# Testing Strategy

> **Status:** Milestone 4 complete — application tests (124 passing), Docker Compose container verification, and Kubernetes (kind) manual verification complete.

## Philosophy

A task is not complete merely because the application starts. Every change must be tested and verified before it is considered done.

## Test Levels

### Unit Tests (Milestone 2 — User, Order, and Payment services complete)

- **Scope:** Individual functions, classes, API endpoint behavior, schemas, repository, and service logic
- **Location:** `tests/unit/`
- **Tools:** pytest, FastAPI TestClient, httpx, SQLite (repository tests)
- **Status:** Complete for User Service (25 tests), Order Service (32 tests), and Payment Service (29 tests) — 86 unit tests passing

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

### Failure Simulation Tests (Planned — Milestone 12)

- **Scope:** Network failures, latency injection, dependency failures
- **Purpose:** Verify observability captures failure symptoms
- **Status:** Planned

### Observability Verification (Planned — Milestones 7–10)

- **Scope:** Metrics appear in Prometheus, logs in Loki, traces in OpenTelemetry
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
| Milestone completion | All tests for that milestone; Milestone 3 requires Compose stack verification; Milestone 4 requires kind stack verification |

## Currently Available Tests

| Test File | Coverage |
|-----------|----------|
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
├── unit/                          # Unit tests (86 passing)
│   ├── order_service/             # Order Service unit tests (32 passing)
│   └── payment_service/           # Payment Service unit tests (29 passing)
├── integration/                   # PostgreSQL + API tests (36 passing)
│   ├── order_service/             # Order Service integration tests (14 passing)
│   └── payment_service/           # Payment Service integration tests (12 passing)
└── e2e/                           # End-to-end cross-service tests (2 passing)
```

**Verified totals:** 86 unit + 36 integration + 2 E2E = **124 tests passing**.

## Quality Gates

Before a milestone is marked complete:

1. All tests for that milestone pass
2. No regressions in previously passing tests
3. Test results are reported before commit authorization
4. New functionality has corresponding test coverage

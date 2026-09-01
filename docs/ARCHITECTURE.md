# Architecture

> **Status:** Milestone 7 in progress — application metrics (`prometheus-client`), Prometheus, and Grafana deployed via Helm and locally verified. User, Order, and Payment Service CRUD, Order → Payment integration, E2E workflows, Docker Compose containerization, Kubernetes (kind) deployment, Helm chart packaging, and GitHub Actions CI/CD verified. Milestone 8 — Alerting is next.

This document describes the architecture of the Kubernetes Reliability Platform. Components marked **Planned** are not yet implemented.

## High-Level Overview

```
Client
  |
  v
User Service (FastAPI)          Client
                                    |
                                    v
                              Order Service (FastAPI)
                                    |
                                    v
                              Payment Service (FastAPI)
                                    |
                                    v
                              PostgreSQL
```

## Application Layer

### User Service

- **Purpose:** User management (create, read, update users)
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL
- **Location:** `services/user_service/`
- **Status:** Complete — `GET /health`, `GET /metrics`, and `/users` CRUD endpoints verified against PostgreSQL, Docker Compose, Kubernetes, and Helm

### Order Service

- **Purpose:** Order management (CRUD) with synchronous Payment Service integration on order creation
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL
- **Location:** `services/order_service/`
- **Dependencies:** Payment Service (synchronous HTTP on order creation via `PAYMENT_SERVICE_URL`)
- **Status:** Complete — `/orders` CRUD endpoints, Order → Payment integration, and `GET /metrics` verified against PostgreSQL, Docker Compose, Kubernetes, and Helm. Kubernetes probes remain on `GET /orders` (no `/health` endpoint)

### Payment Service

- **Purpose:** Payment processing for orders (CRUD)
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL
- **Location:** `services/payment_service/`
- **Port:** 8003
- **Dependencies:** Order Service (reference via `order_id` only — no cross-service FK or reverse HTTP integration)
- **Status:** Complete — `GET /health`, `GET /metrics`, and `/payments` CRUD endpoints verified against PostgreSQL, Docker Compose, Kubernetes, and Helm

## Data Layer

- **Database:** PostgreSQL (shared instance for local development)
- **ORM:** SQLAlchemy 2.x (synchronous)
- **Location:** `services/<service_name>/app/db/` (each service has its own engine, session factory, and declarative Base)
- **Status:** Implemented — engine, session factory, declarative Base, `get_db` dependency, connectivity check, and ORM models (`User`, `Order`, `Payment`)

## Containerization (Milestone 3 — implemented)

- Each microservice packaged as a Docker image (`services/*/Dockerfile`)
- Local multi-service orchestration via `docker-compose.yml`
- PostgreSQL 16 in Compose with named volume persistence
- Compose network (`krp-network`) for service-name DNS (`postgres`, `user-service`, `order-service`, `payment-service`)
- Container healthchecks: PostgreSQL `pg_isready`; User/Payment `/health`; Order `GET /orders`
- Order Service uses `PAYMENT_SERVICE_URL=http://payment-service:8003` inside Compose
- **Status:** Complete — verified via `docker compose build`, `docker compose up`, and host/Compose-network checks

## Kubernetes (Milestone 4 — implemented)

- Local Kubernetes cluster via kind (`krp`, context `kind-krp`)
- Namespace `krp` (pre-existing; not managed by manifests)
- Plain YAML manifests under `k8s/` — M4 reference implementation (retained alongside Helm)
- Workloads: PostgreSQL, user-service, payment-service, order-service (Deployments, `replicas: 1`)
- ClusterIP Services: `postgres:5432`, `user-service:8001`, `order-service:8002`, `payment-service:8003`
- PostgreSQL `postgres:16` with PVC `postgres-data` (1Gi)
- ConfigMaps for non-sensitive configuration (`user-service-config`, `payment-service-config`, `order-service-config`)
- Shared Secret `postgres-credentials` for database credentials (local placeholder only)
- Local application images (`krp-*-service:local`, `imagePullPolicy: Never`) loaded via `kind load docker-image`
- Liveness and readiness probes with resource requests/limits on all workloads
- Probe paths: postgres `pg_isready`; User/Payment `GET /health`; Order `GET /orders` (Order Service has no `/health` endpoint)
- Order Service uses `PAYMENT_SERVICE_URL=http://payment-service:8003` inside the cluster
- **Status:** Complete — verified via manual in-cluster checks; see `k8s/README.md` for `kubectl apply` workflow

## Helm (Milestone 5 — implemented)

- Umbrella chart `helm/krp/` (`krp-0.2.0`) packages postgres, user-service, payment-service, order-service, prometheus, and grafana
- Parameterized via `values.yaml` (baseline defaults) and `values-local.yaml` (non-sensitive local kind overrides)
- `postgres.storage.existingClaim` — when set, reuses an existing PVC instead of creating `postgres-data` (M4 → M5 data preservation)
- Deploy and manage releases with `helm upgrade --install`, `helm upgrade`, `helm history`, and `helm rollback`
- Static validation: `helm lint`, `helm template`
- Secrets remain local-development placeholders (`change_me`); not production credentials
- **Status:** Complete — verified via Helm install/upgrade on kind cluster `krp`; see `helm/krp/README.md` for operational commands

## CI/CD (Milestone 6 — implemented)

- **CI workflow:** `.github/workflows/ci.yml` — triggers on `pull_request`; `permissions: contents: read`
- **CD workflow:** `.github/workflows/cd.yml` — triggers on `push` to `main`; `permissions: contents: read`
- **CI pipeline:** Python 3.10, `uv sync --dev --frozen`, Ruff lint, full pytest suite (139 tests) with PostgreSQL 16 service container, Docker builds (`krp-*-service:ci`), `helm lint`, `helm template`
- **CD pipeline:** Docker Buildx builds, kind v0.33.0 ephemeral cluster on the GitHub-hosted runner, `kind load docker-image`, Helm deploy of `helm/krp/` into namespace `krp` using `values.yaml` with `--set images.*.tag=ci`, deployment readiness waits (postgres, user-service, payment-service, order-service, prometheus, grafana), in-cluster HTTP and monitoring smoke tests, automatic cluster cleanup (`if: always()`)
- **Not production deployment:** CD uses a disposable ephemeral kind cluster on the runner; no container registry, no cloud Kubernetes, no deployment to a developer's local kind cluster
- **Credential handling:** CI/CD credential handling reviewed and documented; no GitHub Secrets or dedicated secrets-management mechanism; PostgreSQL password remains local-development placeholder (`change_me`)
- **Status:** Complete — GitHub Actions CI verified; CD workflow extended for M7 monitoring smoke checks (GHA end-to-end verification pending)

## Application Metrics (Milestone 7 — implemented)

All three services expose Prometheus-compatible `GET /metrics` via `prometheus-client`:

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | `service`, `method`, `handler` (FastAPI route template), `status` |
| `http_request_duration_seconds` | Histogram | `service`, `method`, `handler` |

- Middleware records request count and duration; `/metrics` endpoint is excluded from request metrics
- Per-service `CollectorRegistry` avoids test registration conflicts
- **Status:** Implemented — 15 metrics unit tests; verified locally on kind

## Observability

| Component | Purpose | Status |
|-----------|---------|--------|
| Prometheus | Metrics collection and PromQL queries | Implemented (M7 — `helm/krp/`, static Service-DNS scraping) |
| Grafana | Dashboards and visualization | Implemented (M7 — provisioned datasource and **KRP Service Health** dashboard) |
| Alertmanager | Alert routing and notification | Planned (M8) |
| Loki | Centralized log aggregation | Planned (M9) |
| OpenTelemetry | Distributed tracing | Planned (M10) |

## SRE Layer (Planned — Milestones 11–13)

- SLIs, SLOs, and error budgets
- Incident simulation scenarios
- Runbooks for common failure modes
- **Status:** Planned

## AI Layer (Planned — Milestones 14–17)

- AI Incident Analyzer for root cause analysis
- Tool calling for Kubernetes API interaction
- RAG for runbook and documentation retrieval
- Human-in-the-loop controlled remediation
- **Status:** Planned

> AI is the final layer. The platform must work fully without AI before AI capabilities are introduced.

## User Service Package Structure

```
services/user_service/
└── app/
    ├── main.py              # FastAPI application entry point
    ├── api/
    │   ├── router.py        # Aggregates API routers
    │   └── routes/
    │       ├── health.py    # Health check endpoint
    │       └── users.py     # User CRUD endpoints
    ├── core/
    │   ├── config.py        # Environment-based settings (incl. PostgreSQL)
    │   └── exceptions.py    # Application exceptions
    ├── db/
    │   └── database.py      # SQLAlchemy engine, Base, sessions, connectivity check
    ├── models/
    │   └── user.py          # User ORM model
    ├── repositories/
    │   └── user.py          # User data access
    ├── services/
    │   └── user.py          # User business logic
    └── schemas/
        ├── health.py        # Health response model
        └── user.py          # User request/response schemas
```

## Order Service Package Structure

```
services/order_service/
└── app/
    ├── main.py              # FastAPI application entry point
    ├── api/
    │   ├── router.py        # Aggregates API routers
    │   └── routes/
    │       └── orders.py    # Order CRUD endpoints
    ├── core/
    │   ├── config.py        # Environment-based settings (port 8002)
    │   └── exceptions.py    # OrderNotFoundError, InvalidOrderStateError
    ├── db/
    │   └── database.py      # SQLAlchemy engine, Base, sessions
    ├── models/
    │   └── order.py         # Order ORM model and OrderStatus enum
    ├── repositories/
    │   └── order.py         # Order data access
    ├── services/
    │   └── order.py         # Order business logic
    └── schemas/
        └── order.py         # Order request/response schemas
```

### Order Model

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | Primary key |
| `user_id` | integer | Reference to User Service (no cross-service FK) |
| `status` | enum | `pending`, `paid`, `cancelled` (default: `pending`) |
| `total_amount` | decimal(10,2) | Must be positive |
| `created_at` | datetime | Set on creation |
| `updated_at` | datetime | Updated on modification |

## Payment Service Package Structure

```
services/payment_service/
└── app/
    ├── main.py              # FastAPI application entry point
    ├── api/
    │   ├── router.py        # Aggregates API routers
    │   └── routes/
    │       ├── health.py    # Health check endpoint
    │       └── payments.py  # Payment CRUD endpoints
    ├── core/
    │   ├── config.py        # Environment-based settings (port 8003)
    │   └── exceptions.py    # PaymentNotFoundError, InvalidPaymentStateError
    ├── db/
    │   └── database.py      # SQLAlchemy engine, Base, sessions
    ├── models/
    │   └── payment.py       # Payment ORM model and PaymentStatus enum
    ├── repositories/
    │   └── payment.py       # Payment data access
    ├── services/
    │   └── payment.py       # Payment business logic
    └── schemas/
        ├── health.py        # Health response model
        └── payment.py       # Payment request/response schemas
```

### Payment Model

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | Primary key |
| `order_id` | integer | Reference to Order Service (no cross-service FK) |
| `amount` | decimal(10,2) | Must be positive |
| `status` | enum | `pending`, `successful`, `failed` (default: `pending`) |
| `created_at` | datetime | Set on creation |
| `updated_at` | datetime | Updated on modification |

### Payment Status Transitions

| From | Allowed transitions |
|------|---------------------|
| `pending` | `successful`, `failed` |
| `successful` | Terminal — no updates allowed |
| `failed` | Terminal — no updates allowed |

Amount updates are allowed only while status is `pending`.

## Design Principles

- Business logic remains intentionally simple
- Microservices exist to create realistic operational scenarios
- Each technology is introduced only when its milestone begins
- Local-first — no AWS dependency for core implementation

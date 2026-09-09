# Architecture

> **Status:** Milestone 11 complete — SRE SLIs, SLOs, error budgets, Prometheus recording rules, SRE alert rules, and Grafana **KRP SRE** dashboard deployed via Helm and verified (manual E2E on kind cluster `krp`). Distributed tracing with OpenTelemetry, Collector, and Tempo verified. Structured JSON logging, Loki, Grafana Alloy, and **KRP Service Logs** dashboard verified. Alertmanager, Prometheus alert rules, and severity-based routing verified. Application metrics, Prometheus, and Grafana verified (local kind and GitHub Actions CD). Milestone 12 — Incident Simulation is next.

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

- Umbrella chart `helm/krp/` (`krp-0.6.0`) packages postgres, user-service, payment-service, order-service, prometheus, grafana, alertmanager, loki, alloy, tempo, and otel-collector
- Parameterized via `values.yaml` (baseline defaults) and `values-local.yaml` (non-sensitive local kind overrides)
- `postgres.storage.existingClaim` — when set, reuses an existing PVC instead of creating `postgres-data` (M4 → M5 data preservation)
- Deploy and manage releases with `helm upgrade --install`, `helm upgrade`, `helm history`, and `helm rollback`
- Static validation: `helm lint`, `helm template`
- Secrets remain local-development placeholders (`change_me`); not production credentials
- **Status:** Complete — verified via Helm install/upgrade on kind cluster `krp`; see `helm/krp/README.md` for operational commands

## CI/CD (Milestone 6 — implemented)

- **CI workflow:** `.github/workflows/ci.yml` — triggers on `pull_request`; `permissions: contents: read`
- **CD workflow:** `.github/workflows/cd.yml` — triggers on `push` to `main`; `permissions: contents: read`
- **CI pipeline:** Python 3.10, `uv sync --dev --frozen`, Ruff lint, full pytest suite (180 tests) with PostgreSQL 16 service container, Docker builds (`krp-*-service:ci`), `helm lint`, `helm template`
- **CD pipeline:** Docker Buildx builds, kind v0.33.0 ephemeral cluster on the GitHub-hosted runner, `kind load docker-image`, Helm deploy of `helm/krp/` into namespace `krp` using `values.yaml` with `--set images.*.tag=ci`, deployment readiness waits (postgres, user-service, payment-service, order-service, prometheus, grafana), in-cluster HTTP and monitoring smoke tests, automatic cluster cleanup (`if: always()`)
- **Not production deployment:** CD uses a disposable ephemeral kind cluster on the runner; no container registry, no cloud Kubernetes, no deployment to a developer's local kind cluster
- **Credential handling:** CI/CD credential handling reviewed and documented; no GitHub Secrets or dedicated secrets-management mechanism; PostgreSQL password remains local-development placeholder (`change_me`)
- **Status:** Complete — GitHub Actions CI and CD verified; CD workflow includes M7 monitoring smoke checks (GitHub Actions CD end-to-end verification **PASSED**, commit `34f919b`)

## Application Metrics (Milestone 7 — implemented)

All three services expose Prometheus-compatible `GET /metrics` via `prometheus-client`:

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | `service`, `method`, `handler` (FastAPI route template), `status` |
| `http_request_duration_seconds` | Histogram | `service`, `method`, `handler` |

- Middleware records request count and duration; `/metrics` endpoint is excluded from request metrics
- Per-service `CollectorRegistry` avoids test registration conflicts
- **Status:** Implemented — 15 metrics unit tests (included in 101 unit tests); verified locally on kind and via GitHub Actions CD

## Alerting (Milestone 8 — implemented)

- Alertmanager deployed via `helm/krp/` when `alertmanager.enabled` is `true` (default)
- Image: `prom/alertmanager:v0.27.0`; single replica; ClusterIP Service on port 9093; non-persistent `emptyDir` storage at `/alertmanager`
- Prometheus forwards alerts to `alertmanager:9093` via `alerting.alertmanagers` in the Prometheus ConfigMap
- Prometheus alert rules in ConfigMap `prometheus-rules` (`krp_alerts.yml`), mounted at `/etc/prometheus/rules`
- Alert rules (failure-condition — M8):
  - **`KRPServiceTargetDown`** — `up{job=~"user-service|order-service|payment-service"} == 0`, `severity: critical`, `for: 1m`
  - **`KRPHigh5xxErrorRate`** — 5xx request ratio `> 0.50` per `service`, `severity: warning`, `for: 2m`
- Alert rules (SRE — M11, see SRE Practices section):
  - **`KRPSLOAvailabilityViolation`** — `krp:sli:availability:ratio < 0.99`, `severity: warning`, `for: 10m`
  - **`KRPSLOErrorBudgetExhausted`** — `krp:slo:availability:error_budget:remaining == 0`, `severity: warning`, `for: 5m`
  - **`KRPHighP95Latency`** — `krp:sli:latency:p95:seconds > 0.5`, `severity: warning`, `for: 5m`
- Alertmanager routing: default receiver `default`; `group_by: [alertname, service, job]`; `group_wait: 30s`; `group_interval: 5m`; `repeat_interval: 12h`
- Severity routing: `severity="critical"` → `critical` receiver; `severity="warning"` → `warning` receiver
- Receivers (`default`, `critical`, `warning`) are local/null only — no external notification integrations
- Prometheus ConfigMap changes require manual `kubectl rollout restart deployment/prometheus -n krp` after Helm upgrade (no checksum annotation on Deployment)
- CD workflow unchanged — no Alertmanager smoke checks added in M8
- **Status:** Implemented — manual E2E verification on kind cluster `krp` for critical and warning alert paths (firing, Alertmanager receipt, receiver routing, resolution)

## Centralized Logging (Milestone 9 — implemented)

Application services emit structured JSON logs to stdout (one JSON object per line). Grafana Alloy collects Kubernetes container logs from application pods in namespace `krp` and ships them to Loki.

```
Application services → structured JSON stdout → Kubernetes pod logs → Grafana Alloy → Loki → Grafana
```

- **Structured logging:** Python stdlib logging with JSON formatter; required fields: `timestamp`, `level`, `service`, `logger`, `message`; `service` aligns with M7 metric label (`user-service`, `order-service`, `payment-service`)
- **Loki:** `grafana/loki:3.4.2`; monolithic `-target=all`; ClusterIP Service `loki:3100`; TSDB/filesystem storage; 72h retention; non-persistent `emptyDir` storage
- **Grafana Alloy:** `grafana/alloy:v1.9.2`; DaemonSet; Kubernetes API-based log collection; collects only the three application services; pushes to `http://loki:3100/loki/api/v1/push`
- **Loki labels (low cardinality):** `namespace`, `service`, `container`, `level`
- **Grafana:** Loki datasource (`uid: loki`, not default); **KRP Service Logs** dashboard (`krp-service-logs`) with service and level filters
- **Log/metric correlation:** Shared `service` label between Prometheus metrics and Loki logs; temporal overlap during request activity (not one-to-one event correlation)
- **Status:** Implemented — 27 logging unit tests; manual kind E2E verification for Loki, Alloy, Grafana datasource/dashboard, and log/metric correlation

## Distributed Tracing (Milestone 10 — implemented)

Application services instrument requests with the OpenTelemetry SDK and export traces via OTLP gRPC to the OpenTelemetry Collector. The Collector forwards traces to Grafana Tempo. Grafana queries Tempo over HTTP for trace visualization.

```
Application services
        |
        | OTLP gRPC (OpenTelemetry SDK)
        v
OpenTelemetry Collector (otel-collector:4317)
        |
        | OTLP gRPC
        v
Grafana Tempo (tempo:4317 ingest, tempo:3200 query)
        |
        v
Grafana Explore (Tempo datasource, uid: tempo)
```

- **Instrumentation:** FastAPI (inbound HTTP), httpx (outbound HTTP), SQLAlchemy (database queries); W3C Trace Context propagation
- **OpenTelemetry Collector:** `otel/opentelemetry-collector-contrib:0.120.0`; Deployment; ClusterIP Service `otel-collector:4317`; pipeline `otlp` → `batch` → `otlp` → Tempo
- **Tempo:** `grafana/tempo:2.7.2`; monolithic `-target=all`; ClusterIP ports 3200 (query) and 4317 (OTLP gRPC); non-persistent `emptyDir` storage; 72h retention
- **Service naming:** OpenTelemetry `service.name` matches `SERVICE_NAME` and M7/M9 `service` label (`user-service`, `order-service`, `payment-service`)
- **Cross-service propagation:** Order Service → Payment Service via `httpx` on `POST /orders`; W3C `traceparent` headers; shared `trace_id` across services
- **Log correlation:** Optional `trace_id` and `span_id` in JSON log body when a span is active (not Loki labels)
- **Grafana Alloy:** Unchanged — logs only (ADR-023)
- **Status:** Implemented — 14 tracing unit tests; manual kind E2E verification for cross-service Order → Payment traces in Grafana Explore

## SRE Practices (Milestone 11 — implemented)

SLIs, SLOs, and error budgets are derived from existing M7 HTTP metrics via Prometheus recording rules in ConfigMap `prometheus-rules` (`krp-sre-slos` group). No application code changes.

```
http_requests_total / http_request_duration_seconds_bucket (M7)
        |
        v
Prometheus recording rules (krp:sli:*, krp:slo:*)
        |
        +--> Grafana **KRP SRE** dashboard (uid: krp-sre)
        |
        +--> Prometheus SRE alert rules → Alertmanager
```

- **SLIs:** Request availability (non-5xx ratio) and P95 request latency per service (ADR-024)
- **SLO targets:** 99.0% availability, P95 ≤ 500ms, 6-hour rolling window
- **Error budget:** Availability SLO only; `consumed = (1 - SLI) / 0.01`, `remaining = max(0, 1 - consumed)`
- **Recording rules:** `krp:http_requests:rate5m`, `krp:sli:availability:ratio`, `krp:sli:errors:5xx:ratio`, `krp:sli:latency:p95:seconds`, `krp:slo:availability:target`, `krp:slo:availability:error_budget:consumed`, `krp:slo:availability:error_budget:remaining`, `krp:slo:availability:compliant`, `krp:slo:latency:p95:compliant`
- **Probe handling:** `user-service` and `payment-service` exclude `handler="/health"` from SLIs; `order-service` includes all traffic (probe limitation — ADR-024)
- **Grafana:** **KRP SRE** dashboard (`uid: krp-sre`, tags `krp`/`m11`, 12 panels, `$service` variable, Prometheus datasource, default range `now-6h`)
- **Status:** Implemented — manual kind E2E verification for recording rules, SLO alerts (`KRPSLOAvailabilityViolation`, `KRPSLOErrorBudgetExhausted` firing and resolution), dashboard, and M7–M10 regression; `KRPHighP95Latency` loaded but deliberate firing not demonstrated (ADR-024 step 13)

## Observability

| Component | Purpose | Status |
|-----------|---------|--------|
| Prometheus | Metrics collection and PromQL queries | Implemented (M7 — `helm/krp/`, static Service-DNS scraping; M11 recording rules) |
| Grafana | Dashboards and visualization | Implemented (M7/M9/M11 — **KRP Service Health**, **KRP Service Logs**, **KRP SRE**; M10 Tempo Explore) |
| Alertmanager | Alert routing and notification | Implemented (M8/M11 — local/null receivers; severity-based routing) |
| Loki | Centralized log aggregation | Implemented (M9 — `helm/krp/`, Grafana Alloy collection) |
| Grafana Alloy | Log collection and shipping to Loki | Implemented (M9 — DaemonSet in namespace `krp`) |
| OpenTelemetry Collector | OTLP trace ingestion and forwarding | Implemented (M10 — `helm/krp/`, Service `otel-collector`) |
| Grafana Tempo | Trace storage and query backend | Implemented (M10 — `helm/krp/`, datasource `uid: tempo`) |
| OpenTelemetry SDK | Application distributed tracing | Implemented (M10 — all three services) |

## Incident Response Layer (Planned — Milestones 12–13)

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

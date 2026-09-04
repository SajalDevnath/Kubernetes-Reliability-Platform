# Architecture Decision Records

This log records significant architectural and technical decisions for the Kubernetes Reliability Platform.

---

## ADR-001 — Use Local Kubernetes for the Core Project

**Date:** 2026-08-17

**Decision:**
The core project will run locally using kind for Kubernetes clusters.

**Reason:**
The project should not depend on AWS or other cloud providers for learning Kubernetes and SRE concepts. Local development reduces cost, complexity, and external dependencies while providing full Kubernetes functionality.

**Status:** Accepted

---

## ADR-002 — Use Python/FastAPI for the Application Layer

**Date:** 2026-08-17

**Decision:**
The microservices will be implemented using Python and FastAPI.

**Reason:**
The project focuses on Cloud/DevOps/SRE rather than Java-specific backend development. Python provides a natural foundation for the later AI layer and has excellent ecosystem support for FastAPI, SQLAlchemy, and observability tooling.

**Status:** Accepted

---

## ADR-003 — Use uv for Python Dependency Management

**Date:** 2026-08-17

**Decision:**
Python dependency and environment management will use `uv`.

**Reason:**
`uv` provides a modern, fast, and simple approach to Python project and dependency management, replacing the need for pip, pip-tools, and virtualenv separately.

**Status:** Accepted

---

## ADR-004 — Use PostgreSQL as the Database

**Date:** 2026-08-17

**Decision:**
PostgreSQL will be the database for all microservices.

**Reason:**
PostgreSQL is widely used, well-supported, runs locally in containers, and integrates naturally with SQLAlchemy. It provides realistic operational scenarios for database monitoring and failure simulation.

**Status:** Accepted

---

## ADR-005 — AI as the Final Layer

**Date:** 2026-08-17

**Decision:**
AI capabilities (incident analysis, tool calling, RAG, remediation) will be introduced only after the reliability platform works fully without AI.

**Reason:**
The platform must demonstrate operational engineering fundamentals independently. AI should augment existing observability and runbooks, not replace them. This ensures the reliability foundation is solid before adding AI complexity.

**Status:** Accepted

---

## ADR-006 — Intentionally Simple Business Logic

**Date:** 2026-08-17

**Decision:**
Application business logic will remain intentionally simple across all microservices.

**Reason:**
The primary purpose is demonstrating operational and reliability engineering concepts — not building a complex business application. Simple logic keeps focus on infrastructure, observability, and SRE practices.

**Status:** Accepted

---

## ADR-007 — Monorepo Layout with `services/` Directory

**Date:** 2026-08-18

**Decision:**
Application microservices will live under `services/<service_name>/` with a shared root `pyproject.toml` managed by uv.

**Reason:**
This layout scales naturally to three microservices (User, Order, Payment) while keeping a single dependency lockfile and consistent tooling at the repository root. Each service owns its `app/` package with routers, schemas, and core configuration.

**Status:** Accepted

---

## ADR-008 — Non-Package uv Project for Application Code

**Date:** 2026-08-18

**Decision:**
The root `pyproject.toml` uses `[tool.uv] package = false` because the repository is an application monorepo, not a publishable Python library.

**Reason:**
Services are run directly via uvicorn with `--app-dir` rather than installed as editable packages. This avoids unnecessary build configuration while still using uv for dependency management and virtual environments.

**Status:** Accepted

---

## ADR-009 — Synchronous SQLAlchemy for Milestone 1

**Date:** 2026-08-19

**Decision:**
The User Service database layer will use synchronous SQLAlchemy 2.x APIs with the `psycopg2` driver.

**Reason:**
The existing FastAPI endpoints are synchronous, and the milestone scope is establishing a minimal database foundation. Synchronous SQLAlchemy keeps the initial implementation simple; async database access can be evaluated later if needed.

**Status:** Accepted

---

## ADR-010 — Minimal User Model Fields

**Date:** 2026-08-20

**Decision:**
The User Service will use a minimal user model with `email`, `full_name`, and `is_active` fields. No password or authentication fields are included at this stage.

**Reason:**
The project specification does not define detailed user fields, and authentication is out of scope for Milestone 2. A minimal model supports CRUD demonstration without introducing unnecessary security complexity before it is required.

**Status:** Accepted

**Verification:** User Service CRUD and PostgreSQL integration tests passing (2026-08-20).

---

## ADR-011 — Minimal Order Model Fields

**Date:** 2026-08-22

**Decision:**
The Order Service will use a minimal `Order` model with `user_id`, `status`, and `total_amount` fields, plus standard timestamps. `user_id` is stored as an integer reference to the User Service without a database foreign key constraint. `OrderStatus` values are `pending`, `paid`, and `cancelled`.

**Reason:**
The project specification defines order management and future Order → Payment communication but does not specify detailed order fields. `user_id` links an order to a user, `status` supports order lifecycle and payment outcomes, and `total_amount` supports payment processing. Omitting a cross-service foreign key follows microservice boundaries while sharing PostgreSQL for local development.

**Status:** Accepted

**Verification:** Order Service CRUD and PostgreSQL integration tests passing (2026-08-22).

---

## ADR-012 — Minimal Payment Model Fields

**Date:** 2026-08-23

**Decision:**
The Payment Service will use a minimal `Payment` model with `order_id`, `amount`, and `status` fields, plus standard timestamps. `order_id` is stored as an integer reference to the Order Service without a database foreign key constraint. `PaymentStatus` values are `pending`, `successful`, and `failed`. No card numbers, CVV, or other sensitive payment credentials are stored.

**Reason:**
The project specification defines payment processing and future Order → Payment communication but does not specify detailed payment fields. `order_id` links a payment to an order, `amount` records the payment value, and `status` tracks payment outcome. Omitting a cross-service foreign key follows microservice boundaries while sharing PostgreSQL for local development. Sensitive payment data is excluded by design.

**Status:** Accepted

**Verification:** Payment Service CRUD and PostgreSQL integration tests passing (2026-08-23).

---

## ADR-013 — Synchronous Order → Payment HTTP Integration

**Date:** 2026-08-25

**Decision:**
Order Service will create a payment synchronously over HTTP immediately after flushing a new order record and before committing the order transaction. Communication uses a dedicated `PaymentServiceClient` (`httpx`) configured via `PAYMENT_SERVICE_URL` and `PAYMENT_SERVICE_TIMEOUT_SECONDS` (default 5.0 seconds). On payment failure, Order Service rolls back the uncommitted order and returns HTTP 503 (unavailable), 504 (timeout), or 502 (Payment Service error/malformed response). Order creation must not return 201 unless payment creation succeeds.

**Reason:**
Milestone 2 requires Order → Payment communication without introducing message brokers, sagas, background workers, retries, or circuit breakers. Synchronous HTTP with flush-then-commit avoids persisting orphan orders in the common failure path while keeping the implementation simple and testable.

**Consistency limitation:**
This is not a distributed transaction. Edge cases remain possible (for example, payment succeeds but order commit fails, or payment succeeds after a timeout from the caller's perspective). Phase 1 accepts this limitation explicitly.

**Status:** Accepted

---

## ADR-014 — Milestone 4 Plain Kubernetes Manifests on kind

**Date:** 2026-08-27

**Decision:**
Milestone 4 will deploy the platform using plain YAML manifests under `k8s/` on a local kind cluster (`krp`, namespace `krp`). Helm packaging is deferred to Milestone 5. PostgreSQL runs as a single shared Deployment with a 1Gi PVC (`postgres-data`). Non-sensitive configuration is supplied via ConfigMaps; database credentials use a shared `postgres-credentials` Secret (local placeholder `change_me` only). Application images are built locally, loaded into kind via `kind load docker-image`, and referenced with `imagePullPolicy: Never`. The pre-existing `krp` namespace is used explicitly and is not created by manifests. Order Service liveness and readiness probes use `GET /orders` because the service has no `/health` endpoint.

**Reason:**
Milestone 4 requires Deployments, Services, ConfigMaps, Secrets, probes, and resource limits on kind without introducing Helm, CI/CD, or application code changes. Plain manifests mirror the existing Docker Compose service topology and keep verification manual and repeatable, consistent with Milestone 3 container verification.

**Status:** Accepted

**Verification:** All four workloads verified Running on kind cluster `krp` (2026-08-27). In-cluster DNS, probes, database-backed workflows, and Order → Payment communication verified. Existing pytest suite (124 tests) and Docker Compose parity verified with no regression.

---

## ADR-015 — Milestone 5 Helm Chart Packaging the M4 Topology

**Date:** 2026-08-29

**Decision:**
Milestone 5 will package the Milestone 4 Kubernetes deployment as a single umbrella Helm chart at `helm/krp/` (`krp-0.1.0`). The chart reproduces the existing topology (postgres, user-service, payment-service, order-service) without redesigning workloads, service names, ports, probes, or in-cluster DNS contracts. Plain YAML manifests under `k8s/` remain the M4 reference implementation and are not removed or replaced. Configuration is parameterized via `values.yaml` with non-sensitive local overrides in `values-local.yaml`. Database credentials remain in a `postgres-credentials` Secret (local placeholder `change_me` only). For M4 → M5 migration on an existing kind cluster, `postgres.storage.existingClaim` allows Helm to reuse the existing `postgres-data` PVC so PostgreSQL data is preserved; when `existingClaim` is empty, the chart creates `postgres-data`.

**Reason:**
Milestone 5 requires Helm packaging and environment-specific configuration without changing application code or replacing the validated M4 manifests. A single umbrella chart with fixed service names preserves Order → Payment DNS (`http://payment-service:8003`) and keeps migration straightforward. Optional PVC reuse avoids data loss when transitioning from `kubectl apply` to Helm on the same cluster.

**Status:** Accepted

**Verification:** `helm lint` and `helm template` passed; Helm release `krp` installed and upgraded on kind cluster `krp` (2026-08-29). M4 PVC preserved; in-cluster and API workflows verified. Payment status updates remain owned by Payment Service; Order status is not automatically synchronized when a payment becomes `successful`.

---

## ADR-016 — Milestone 6 GitHub Actions CI/CD with Ephemeral kind CD

**Date:** 2026-08-31

**Decision:**
Milestone 6 will automate build, test, and deployment validation using GitHub Actions. CI (`.github/workflows/ci.yml`) triggers on `pull_request` and runs Ruff lint, the full 124-test pytest suite with a PostgreSQL 16 service container, Docker build validation for all three services, and Helm lint/template checks. CD (`.github/workflows/cd.yml`) triggers on `push` to `main` and deploys to an **ephemeral** kind cluster created on the GitHub-hosted runner — not a developer's local kind cluster and not a production environment. CD builds `krp-*-service:ci` images, loads them into kind via `kind load docker-image` (no container registry), deploys `helm/krp/` with `values.yaml` and `--set images.*.tag=ci` (not `values-local.yaml`), waits for all deployments, runs in-cluster HTTP smoke tests, and deletes the cluster with `if: always()`. Both workflows use `permissions: contents: read` only. No GitHub Secrets are required for the current placeholder PostgreSQL credential model.

**Reason:**
Milestone 6 requires automated CI on pull requests and CD on merge to `main` without introducing cloud Kubernetes, container registries, or production credentials. Ephemeral kind on the runner reuses the validated M3–M5 stack (Docker images, Helm chart, in-cluster DNS) while keeping deployments disposable and isolated from developer local clusters.

**Status:** Accepted

**Verification:** GitHub Actions CI workflow passed on pull request; CD workflow passed on push to `main` (2026-08-31). Ephemeral kind deploy, readiness checks, and in-cluster smoke tests verified. Local-development placeholder credentials only.

---

## ADR-017 — Milestone 7 Application Metrics with prometheus-client

**Date:** 2026-09-01

**Decision:**
Milestone 7 will instrument all three FastAPI services with `prometheus-client`. Each service exposes `GET /metrics` with HTTP request instrumentation via middleware:

- `http_requests_total` (Counter) — labels: `service`, `method`, `handler` (FastAPI route template, not raw URL), `status`
- `http_request_duration_seconds` (Histogram) — labels: `service`, `method`, `handler`

The `/metrics` endpoint is excluded from request metrics. Each service uses a per-application `CollectorRegistry` to avoid pytest registration conflicts. `http_requests_in_progress` is not implemented (handler is unknown before routing).

**Reason:**
Milestone 7 requires Prometheus-compatible metrics with low-cardinality labels across all three services. Standard HTTP counters and histograms are sufficient for the **KRP Service Health** dashboard without introducing custom business metrics or high-cardinality labels (user IDs, order IDs, etc.).

**Status:** Accepted

**Verification:** 15 metrics unit tests added (5 per service); **139 total tests passing**. `/metrics` verified on kind cluster (2026-09-01).

---

## ADR-018 — Prometheus Static Service DNS Scraping

**Date:** 2026-09-01

**Decision:**
Prometheus will be deployed via `helm/krp/` with a ConfigMap containing static scrape targets using Kubernetes Service DNS:

- `user-service:8001/metrics`
- `order-service:8002/metrics`
- `payment-service:8003/metrics`

Scrape interval: 15s. No ServiceMonitor, Prometheus Operator, pod annotation discovery, kube-state-metrics, node-exporter, or PostgreSQL exporter will be introduced in M7.

**Reason:**
Milestone 7 requires Prometheus to scrape all three application services on a local kind cluster without introducing additional operators or exporters. Static Service DNS targets match the existing Helm chart service names and ports and keep the deployment self-contained.

**Status:** Accepted

**Verification:** All three Prometheus targets UP on kind cluster `krp` (2026-09-01). `up{job=~"user-service|order-service|payment-service"}` returns `1` for all services.

---

## ADR-019 — Non-Persistent Prometheus and Grafana on kind

**Date:** 2026-09-01

**Decision:**
Prometheus and Grafana deployed via `helm/krp/` will use non-persistent `emptyDir` storage:

- Prometheus TSDB: `/prometheus`
- Grafana data: `/var/lib/grafana`

Pinned images: `prom/prometheus:v2.55.1`, `grafana/grafana:11.4.0`. Single replica each. Grafana admin credentials (`admin` / `change_me`) stored in a Kubernetes Secret (`grafana-credentials`) as local-development placeholders only.

**Reason:**
Milestone 7 targets local kind development and ephemeral CD validation. Non-persistent storage is acceptable for learning and demonstration; production-grade persistent monitoring storage is out of scope for M7.

**Status:** Accepted

**Verification:** Prometheus and Grafana pods Running/Ready on kind cluster `krp`; Grafana datasource and dashboard provisioned via ConfigMaps (2026-09-01).

---

## ADR-020 — Order Service Health Endpoint Unchanged

**Date:** 2026-09-01

**Decision:**
Order Service will not gain a `/health` endpoint in Milestone 7. Kubernetes liveness and readiness probes continue to use `GET /orders`. Docker Compose, `k8s/`, and Helm probe configurations remain unchanged.

**Reason:**
Milestone 7 scope is metrics instrumentation and monitoring deployment, not probe redesign. Order Service was validated in M4 with `GET /orders` probes; adding `/health` would be an unrelated application change with no M7 requirement.

**Status:** Accepted

**Verification:** Order Service probes unchanged in `helm/krp/` templates; Order Service `GET /metrics` added without modifying probe paths (2026-09-01).

---

## ADR-021 — Local-Only Alertmanager Deployment, Routing, and Alert Rules for kind

**Date:** 2026-09-04

**Decision:**
Milestone 8 will deploy Alertmanager via `helm/krp/` with local-only (null) receivers and two Prometheus alert rules:

- **Alertmanager:** `prom/alertmanager:v0.27.0`, single replica, ClusterIP Service on port 9093, non-persistent `emptyDir` storage at `/alertmanager`
- **Prometheus integration:** `alerting.alertmanagers` → `alertmanager:9093` when `alertmanager.enabled`; alert rules in ConfigMap `prometheus-rules` (`krp_alerts.yml`) mounted at `/etc/prometheus/rules`
- **Alert rules:**
  - `KRPServiceTargetDown` — `up{job=~"user-service|order-service|payment-service"} == 0`, `severity: critical`, `for: 1m`
  - `KRPHigh5xxErrorRate` — 5xx request ratio `> 0.50` per `service`, `severity: warning`, `for: 2m`
- **Routing:** default receiver `default`; `group_by: [alertname, service, job]`; `group_wait: 30s`; `group_interval: 5m`; `repeat_interval: 12h`; `severity="critical"` → `critical` receiver; `severity="warning"` → `warning` receiver
- **Receivers:** `default`, `critical`, `warning` — empty (local/null only); no Slack, email, PagerDuty, or webhook integrations
- **Helm chart version:** `krp-0.3.0` (bump from `krp-0.2.0` at M7 close)
- **Explicit exclusions:** no P95 latency alert; no SLO or error-budget alerts (Milestone 11); no Prometheus Operator or ServiceMonitor; no CD workflow changes; no automated alert tests; no promtool/amtool CI integration
- **Operational note:** Prometheus ConfigMap changes require manual `kubectl rollout restart deployment/prometheus -n krp` after Helm upgrade (no checksum annotation on Deployment)

**Reason:**
Milestone 8 requires alert routing and failure-condition alerting on a local kind cluster without external notification providers or production-grade persistence. Two focused alert rules exercise critical and warning severity paths using existing M7 metrics. Local/null receivers keep the stack self-contained for learning and demonstration. SLO-violation alerting belongs to Milestone 11.

**Status:** Accepted

**Verification:** Manual E2E on kind cluster `krp` (2026-09-03) — `KRPServiceTargetDown` fires and routes to `critical` receiver (`user-service` scale to 0); `KRPHigh5xxErrorRate` fires at ~71% 5xx ratio and routes to `warning` receiver for `order-service` (`payment-service` scale to 0 + sustained Order traffic); both alerts resolve after workload restoration. **139 tests** unchanged.

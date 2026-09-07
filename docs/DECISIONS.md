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

---

## ADR-022 — Structured Application Logging, Loki, and Log Collection on kind

**Date:** 2026-09-04

**Decision:**

Milestone 9 implements centralized structured logging with Loki on the local kind cluster. Application services emit JSON logs to stdout; Grafana Alloy collects and ships logs to Loki via Kubernetes API-based collection; Grafana provisions a Loki datasource and a complementary log dashboard. Log/metric correlation uses the existing M7 `service` label as the shared anchor.

### Scope (M9 includes)

- Structured JSON logging in `user-service`, `order-service`, and `payment-service`
- Loki deployment via `helm/krp/`
- Kubernetes log collection and shipping with Grafana Alloy
- Grafana Loki datasource and **KRP Service Logs** dashboard
- Log/metric correlation demonstration (manual E2E)
- Documentation updates at M9 closeout

### Scope (M9 excludes)

- OpenTelemetry / distributed tracing (Milestone 10)
- SLO / error-budget alerting (Milestone 11)
- Incident simulation, runbooks, AI features, frontend
- Production-grade persistent logging or external logging backends
- Unrelated Prometheus / Alertmanager changes
- Changes to `k8s/` reference manifests
- Mandatory CI/CD workflow changes (same precedent as M8)
- Promtail (end-of-life March 2, 2026; not suitable for new deployments)

### Structured log format

All application stdout logs (including Uvicorn access and error logs) use **one JSON-per-line** format written to stdout. No additional logging dependencies (stdlib `logging` with a shared JSON formatter).

**Required fields:**

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `timestamp` | string | logger | ISO 8601 UTC with `Z` suffix (e.g. `2026-09-04T12:00:00.123Z`) |
| `level` | string | logger | Uppercase: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `service` | string | `SERVICE_NAME` env / `Settings.service_name` | Must match M7 metric label: `user-service`, `order-service`, `payment-service` |
| `logger` | string | logger | Python logger name (module path) |
| `message` | string | logger | Human-readable log message |

**Optional fields (JSON body only — never Loki labels):**

| Field | When present |
|-------|----------------|
| `method`, `path`, `status_code`, `duration_ms` | HTTP access logs (Uvicorn access + application request logging) |
| `exc_type`, `exc_message` | Logged exceptions |
| `stack` | Exception stack trace (single string field) |
| `request_id` | When HTTP middleware provides/propagates `X-Request-ID` (optional in M9; not required for correlation) |

**Environment variables (existing, wired in M9):**

- `LOG_LEVEL` → root and Uvicorn logger level (`Settings.log_level`)
- `SERVICE_NAME` → `service` field in every log record (`Settings.service_name`; Helm already sets per-service values)

### Uvicorn logging

**All relevant stdout logs are structured JSON** — application logs, Uvicorn access logs, Uvicorn error logs, and startup/shutdown messages. Uvicorn loggers (`uvicorn`, `uvicorn.access`, `uvicorn.error`) use the same JSON formatter and `StreamHandler` as application loggers. This avoids a mixed text/JSON stream that complicates collection and querying.

### Log collector: Grafana Alloy

**Grafana Alloy** (`grafana/alloy:v1.9.2`) is the log collector and shipper.

**Rationale (Promtail rejected):** Grafana Promtail reached end-of-life on March 2, 2026. Grafana Alloy is the official successor and the recommended collector for shipping Kubernetes container logs to Loki. Alloy is not a separate logging backend; it is the operational agent required to satisfy FR-023 (central Loki aggregation) without adopting EOL Promtail or unapproved alternatives (e.g. Fluent Bit, Elasticsearch).

**Alloy suitability:** DaemonSet on kind; discovers pods via Kubernetes API; tails container logs via `loki.source.kubernetes` (no `hostPath` mounts); pushes to Loki; supports namespace and label filtering; low resource footprint; maintained by Grafana alongside Loki.

**Alternatives considered:** Host filesystem log collection (e.g. mounting `/var/log/pods` or `/var/log/containers` read-only) was evaluated but not adopted. Kubernetes API-based collection via `loki.source.kubernetes` was chosen for the M9 implementation because it avoids host volume mounts, requires only read-only pod/log RBAC, and fits the single-node kind learning environment.

### Loki version and deployment

- **Image:** `grafana/loki:3.4.2`
- **Mode:** Single-binary monolithic (`-target=all`) — smallest deployment appropriate for kind
- **Workload:** `Deployment` (not StatefulSet), **1 replica**
- **Service:** ClusterIP on port **3100** (`loki:3100`)
- **Authentication:** `auth_enabled: false` (local kind only; consistent with no-auth Prometheus scraping)
- **Storage:** Non-persistent `emptyDir` at `/loki` (chunks, index, compactor working directory) — consistent with ADR-019
- **Schema:** TSDB + filesystem, schema `v13`, `replication_factor: 1`, in-memory ring KV store
- **Retention:** `72h` (`limits_config.retention_period`) — sufficient for kind learning; data lost on pod restart
- **Probes:** HTTP `GET /ready` (readiness and liveness) on port 3100
- **Resources (requests/limits):** `100m/256Mi` → `500m/512Mi`

Grafana `11.4.0` (ADR-019) supports Loki 3.x via the built-in Loki datasource; Grafana was not upgraded in M9.

### Kubernetes log collection (Alloy)

- **Workload:** `DaemonSet` (one Alloy pod per kind node)
- **Namespace:** `krp` (chart namespace)
- **RBAC:** ServiceAccount + ClusterRole (get/list/watch `namespaces` and `pods`; get `pods/log`) + ClusterRoleBinding — read-only; required for Kubernetes API pod discovery and log tailing; no secret access; no write permissions
- **Collection scope:** Only application service pods — filter to `app` label in `user-service`, `order-service`, `payment-service`. Does **not** collect logs from `prometheus`, `grafana`, `alertmanager`, `loki`, `alloy`, or `postgres`.
- **Collection mechanism:** Kubernetes API-based log tailing via `loki.source.kubernetes`. There are **no `hostPath` mounts** and no reliance on `/var/log/pods` or `/var/log/containers` in the Helm chart.
- **Service identity:** Derive Loki label `service` from Kubernetes pod label `app` (matches Helm `app:` labels and M7 `service` metric label)
- **Alloy pipeline (implemented):** `discovery.kubernetes` → `discovery.relabel` (namespace scope, `app` filter, label mapping) → `loki.source.kubernetes` → `loki.process` (JSON `level` extraction, `label_drop`) → `loki.write` to `http://loki:3100/loki/api/v1/push`

### Loki label strategy (low cardinality)

**Loki stream labels (low cardinality only):**

| Label | Source | Values (typical) |
|-------|--------|------------------|
| `namespace` | Kubernetes | `krp` |
| `service` | Pod label `app` | `user-service`, `order-service`, `payment-service` |
| `container` | Kubernetes | `user-service`, `order-service`, `payment-service` |
| `level` | Parsed from JSON `level` field | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |

**Not Loki labels:** `request_id`, `user_id`, `order_id`, `payment_id`, `path`, `method`, `status_code`, `pod` (pod name omitted from labels to avoid unnecessary cardinality; query by `service` instead).

All high-cardinality or request-specific fields remain in the JSON log line body and are queryable via LogQL JSON parsers (`| json`) when needed.

### Grafana integration

- **Datasource:** Loki at `http://loki:3100`, **uid:** `loki`, `access: proxy`, `editable: false`
- **Default datasource:** Prometheus remains default (`isDefault: true` on Prometheus only) — M7 **KRP Service Health** dashboard unchanged
- **Provisioning:** `grafana-datasources` ConfigMap extended with Loki; log dashboard JSON added via the existing Grafana dashboards ConfigMap pattern
- **Dashboard:** **KRP Service Logs** — uid `krp-service-logs`
  - Template variables: `service` (`user-service`, `order-service`, `payment-service`), `level` (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - Panels: log volume by `service` over time; live log stream filtered by `service` and `level`; example LogQL: `{namespace="krp", service="$service", level=~"$level"} | json`
  - Default time range: Last 15 minutes (complements M7 metrics dashboard)
  - Purpose: searchable centralized logs; complements (does not replace) M7 metrics dashboard

### Log / metric correlation

Correlation anchor: M7 Prometheus metric label **`service`** (`user-service`, `order-service`, `payment-service`) matches Loki label **`service`** derived from pod label `app`.

**Manual verification scenario (M9 E2E):**

1. Generate HTTP traffic to Order Service (e.g. create/list orders) for ~2 minutes.
2. In Grafana → M7 dashboard: confirm elevated `http_requests_total` rate for `service="order-service"` in Prometheus.
3. In Grafana → M9 log dashboard: filter Loki logs `service="order-service"` over the same time window.
4. Confirm log lines appear with matching `service` identity and overlapping timestamps (access/request logs visible).
5. Logs and metrics need not share every field; shared `service` + time window is sufficient to demonstrate correlation.

### Helm chart design (M9)

- **Chart version:** `krp-0.4.0` (follows M7 `0.2.0` → M8 `0.3.0` milestone bump pattern)
- **New `values.yaml` blocks:** `loki:` and `alloy:` with `enabled`, `image`, `replicas`/`daemonset`, `service.port`, `resources`, `probes`, `retention`, collection filters
- **New templates:** `loki-configmap.yaml`, `loki-deployment.yaml`, `loki-service.yaml`, `alloy-configmap.yaml`, `alloy-daemonset.yaml`, `alloy-rbac.yaml`
- **Modified templates:** `grafana-datasources-configmap.yaml`, `grafana-dashboards-configmap.yaml`, `grafana-deployment.yaml`, `_helpers.tpl` (image helpers)
- **Conditional rendering:** `{{- if .Values.loki.enabled }}` / `{{- if .Values.alloy.enabled }}` (default `true`)
- **Service names/ports:** `loki:3100`; Alloy HTTP UI on `12345` (DaemonSet health/readiness probes only; no ClusterIP Service required for collection)

### Testing strategy

**Automated (CI):**

- **Application unit tests:** JSON schema fields (`timestamp`, `level`, `service`, `logger`, `message`); `service` matches `SERVICE_NAME`; `LOG_LEVEL` filters output; exception logging includes `exc_type` / `exc_message` when applicable
- **Helm:** `helm lint` and `helm template` cover new templates; `helm template` with `loki.enabled=false` and `alloy.enabled=false` verified in manual checks

**Manual E2E (kind cluster `krp`):**

- Loki pod Ready; Alloy DaemonSet Ready
- All three services generating structured JSON logs
- Alloy discovers application pods only (not observability stack)
- LogQL `{namespace="krp", service="user-service"}` (and order, payment) return lines
- Grafana Loki datasource healthy; **KRP Service Logs** dashboard shows data
- Correlation scenario (order-service traffic + overlapping metric/log time window)
- Cleanup: remove temporary traffic jobs/resources; no stray test namespaces

**Not in M9 automated suite:** Loki ingestion E2E, Alloy DaemonSet health, Grafana datasource health (manual kind verification; same pattern as M8 alert E2E). These were verified manually on kind cluster `krp`.

### CI/CD

No changes to `.github/workflows/ci.yml` or `.github/workflows/cd.yml` in M9. CI runs `helm lint` and `helm template`; new templates are picked up automatically. CD does not include Loki smoke checks (M8 Alertmanager precedent). Optional future CD extension is out of M9 scope.

### Resource budget (single-node kind — conservative estimates)

| Component | CPU req / limit | Memory req / limit |
|-----------|-----------------|---------------------|
| Loki | 100m / 500m | 256Mi / 512Mi |
| Alloy (DaemonSet) | 50m / 200m | 128Mi / 256Mi |
| Prometheus (existing) | 100m / 500m | 256Mi / 512Mi |
| Grafana (existing) | 100m / 500m | 128Mi / 256Mi |
| Alertmanager (existing) | 50m / 200m | 64Mi / 128Mi |
| PostgreSQL (existing) | 100m / 500m | 256Mi / 512Mi |
| Three app services (existing) | 150m / 750m | 384Mi / 768Mi |
| **M9 incremental** | **~150m / ~700m** | **~384Mi / ~768Mi** |

Combined observability + apps remain feasible on a typical kind single-node allocation (~4 CPU / 8Gi); M9 adds modest overhead versus M8.

### Risks

| Risk | Mitigation |
|------|------------|
| Alloy not in approved-stack table | Document as required Loki collection agent; official Grafana successor to EOL Promtail |
| kind memory pressure | Conservative requests/limits; 72h retention; emptyDir; collect only three app pods |
| Mixed log formats if Uvicorn not configured | ADR mandates all stdout JSON via shared formatter |
| High-cardinality labels | Strict label allowlist; IDs stay in JSON body |
| Log loss on Loki restart | Accepted for kind (ADR-019 pattern); document limitation |
| Alloy RBAC breadth | ClusterRole limited to read-only `namespaces`/`pods`/`pods/log`; no write permissions; no secret access; no hostPath mounts |

**Reason:**

Milestone 9 requires structured application logs (FR-022), central aggregation in Loki (FR-023), Grafana searchability, and log/metric correlation on a local kind cluster. Grafana Alloy is the only maintained, Loki-native collector that fits project constraints after Promtail EOL. Monolithic Loki with emptyDir matches the established non-persistent observability pattern (ADR-019). JSON stdout logging with a shared `service` field aligns with M7 metrics for correlation without introducing tracing or production storage.

**Status:** Accepted (implemented — Milestone 9)

**Verification:** Structured logging unit tests (27); `helm lint` / `helm template`; manual kind E2E — Loki Ready, Alloy DaemonSet Ready, logs from all three services in Loki, Grafana Loki datasource healthy, **KRP Service Logs** dashboard functional, log/metric correlation via shared `service` label.

---

## ADR-023 — Distributed Tracing with OpenTelemetry, Collector, and Grafana Tempo on kind

**Date:** 2026-09-06

**Decision:**

Milestone 10 will implement distributed tracing with the OpenTelemetry SDK in all three application services, export traces via OTLP to a dedicated OpenTelemetry Collector, store traces in Grafana Tempo, and visualize them in Grafana. Cross-service correlation will use W3C Trace Context propagation across the existing Order Service → Payment Service synchronous `httpx` call. Grafana Alloy remains dedicated to log collection (ADR-022); it will not be extended for traces.

### Scope (M10 includes)

- OpenTelemetry SDK instrumentation in `user-service`, `order-service`, and `payment-service`
- Mandatory instrumentors: FastAPI (inbound HTTP), `httpx` (outbound HTTP on Order → Payment)
- W3C Trace Context propagation for cross-service requests
- OTLP trace export from applications to OpenTelemetry Collector
- OpenTelemetry Collector Deployment (1 replica, ClusterIP) forwarding traces to Tempo
- Grafana Tempo Deployment (1 replica, ClusterIP) with non-persistent `emptyDir` storage
- Grafana Tempo datasource (`uid: tempo`) and lightweight trace visualization (Grafana Explore / Tempo trace view is primary)
- Cross-service trace verification via `POST /orders` (Order Service → Payment Service)
- Per-service latency breakdown visible in trace spans
- Optional `trace_id` / `span_id` fields in M9 structured JSON logs (JSON body only — not Loki labels)
- Helm deployment via `helm/krp/` (`krp-0.5.0`)
- Documentation updates at M10 closeout

### Scope (M10 excludes)

- OpenTelemetry **logging** instrumentation or replacement of M9 structured JSON logging (ADR-022)
- Extending Grafana Alloy for trace collection or export
- Jaeger, Zipkin, or other non-Tempo trace backends
- Production-grade persistent trace storage or external/cloud trace backends
- SLO / error-budget tracing or alerting (Milestone 11)
- Incident simulation, runbooks, AI features (Milestones 12–17)
- Unrelated Prometheus, Alertmanager, Loki, or Alloy changes
- Changes to `k8s/` reference manifests
- Mandatory CI/CD workflow changes (M8/M9 precedent)
- Prometheus Operator, ServiceMonitor, kube-state-metrics, node-exporter, PostgreSQL exporter
- Automatic trace sampling complexity beyond a simple default (e.g. `always_on` for kind learning)

### Trace backend: Grafana Tempo

**Grafana Tempo** (`grafana/tempo:2.7.2`) is the trace storage and query backend.

**Rationale:** Tempo is Grafana’s native distributed tracing backend and integrates directly with Grafana `11.4.0` (ADR-019) via the built-in Tempo datasource and Explore trace view. The project already deploys Grafana, Loki, and Alloy from the Grafana observability stack (M7–M9). Tempo completes the Grafana “metrics + logs + traces” triad without introducing a separate visualization platform. Tempo accepts OTLP ingestion and supports the local kind learning model with a single-binary deployment and filesystem/`emptyDir` storage.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|--------------|
| **Jaeger** | Not in the approved technology table (`PROJECT_MASTER_SPECIFICATION.md` §5). Adds a separate UI/ecosystem; Grafana would still be the primary investigation surface. |
| **Zipkin** | Same as Jaeger — not in approved stack; weaker Grafana integration. |
| **Direct app → Tempo (no collector)** | Rejected — central collector simplifies endpoint configuration, batching, and future pipeline changes; aligns with roadmap task “Deploy trace collector”. |
| **Extend Grafana Alloy for traces** | Rejected — Alloy is the M9 log shipper to Loki (ADR-022). Mixing log and trace pipelines in one agent increases configuration complexity and couples unrelated concerns. Traces use a separate OpenTelemetry Collector. |
| **Cloud-managed tracing (e.g. vendor SaaS)** | Violates NFR-016 (local/no-cloud operation). |

### OpenTelemetry Collector topology

- **Image:** `otel/opentelemetry-collector-contrib:0.120.0`
- **Workload:** `Deployment`, **1 replica** (not DaemonSet)
- **Service:** ClusterIP exposing OTLP ingress for application exporters
- **Rationale for Deployment (not DaemonSet):** All three application services push traces via OTLP to a cluster DNS endpoint. On a single-node kind cluster there is no requirement to collect host-level or node-local telemetry. A single-replica Deployment matches the Loki/Prometheus monolithic pattern (ADR-019, ADR-022) and minimizes resource use.
- **Pipeline:** `otlp` receiver → `batch` processor → `otlp` exporter → Tempo

**Why a separate collector instead of Alloy:**

- ADR-022 assigns Alloy exclusively to Kubernetes log collection → Loki.
- OpenTelemetry Collector is the standard, vendor-neutral component for OTLP ingestion and export.
- Separation keeps log (Alloy/Loki) and trace (Collector/Tempo) pipelines independently testable and configurable.
- No Alloy configuration changes in M10.

### OTLP transport

| Hop | Protocol | Endpoint (in-cluster) |
|-----|----------|------------------------|
| Application → Collector | **OTLP gRPC** | `http://otel-collector:4317` |
| Collector → Tempo | **OTLP gRPC** | `http://tempo:4317` |
| Grafana → Tempo (query) | **HTTP** | `http://tempo:3200` |

**Rationale:** OTLP gRPC on port `4317` matches the commented placeholder in `.env.example` (`OTEL_EXPORTER_OTLP_ENDPOINT`). gRPC is the default OTLP transport for OpenTelemetry Python exporters and Tempo’s OTLP receiver. Grafana queries Tempo via HTTP on port `3200` (Tempo query frontend).

**Application environment (planned):**

- `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317`
- `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` (or implicit default)
- `OTEL_SERVICE_NAME` derived from existing `SERVICE_NAME` / `Settings.service_name`

### Service naming convention

OpenTelemetry `service.name` **must exactly match** the existing M7 metric label and M9 log `service` field:

| Service | `SERVICE_NAME` / `service.name` |
|---------|----------------------------------|
| User Service | `user-service` |
| Order Service | `order-service` |
| Payment Service | `payment-service` |

**Source of truth:** `Settings.service_name` (Helm ConfigMaps already set `SERVICE_NAME` per service). Resource attributes should not introduce alternate names (e.g. `order_service`).

This preserves correlation across Prometheus metrics (`service` label), Loki logs (`service` label from pod `app`), and Tempo traces (`service.name`).

### Instrumentation scope

**Mandatory (M10):**

| Component | Instrumentation | Purpose |
|-----------|-----------------|---------|
| OpenTelemetry SDK | `TracerProvider`, `BatchSpanProcessor`, OTLP exporter | Core tracing |
| FastAPI | `opentelemetry-instrumentation-fastapi` | Inbound HTTP server spans |
| httpx | `opentelemetry-instrumentation-httpx` | Outbound HTTP client spans; **required for FR-025** on Order → Payment |
| W3C Trace Context | Automatic via OTel propagators | `traceparent` / `tracestate` headers on Order → Payment `POST /payments` |

**Recommended (M10):**

| Component | Instrumentation | Purpose |
|-----------|-----------------|---------|
| SQLAlchemy | `opentelemetry-instrumentation-sqlalchemy` | Database query spans (`SELECT`, `INSERT`, etc.) for latency visibility inside each service |

**Explicitly excluded (M10):**

| Component | Reason |
|-----------|--------|
| OpenTelemetry logging instrumentation | Would conflict with or duplicate M9 structured JSON logging (ADR-022). Stdlib `logging` + `JsonFormatter` remain authoritative for logs. |
| Uvicorn separate auto-instrumentation | FastAPI instrumentation covers ASGI/HTTP server spans; avoids duplicate server spans. |
| Prometheus middleware changes | M7 metrics middleware (`PrometheusMiddleware`) remains unchanged unless a concrete double-counting conflict is discovered during implementation. |

**Wiring location (implementation plan — not part of Phase 0):** `create_app()` in each `main.py` (alongside `setup_logging` / `setup_metrics`); `PaymentServiceClient` benefits from global `httpx` instrumentation when using `httpx.Client`.

### Context propagation

- **Standard:** W3C Trace Context (`traceparent`, `tracestate`)
- **Inbound:** FastAPI instrumentation extracts context from incoming HTTP headers.
- **Outbound:** httpx instrumentation injects context on Order Service → Payment Service requests (`services/order_service/app/clients/payment.py`).
- **Cross-service requirement (FR-025):** Order Service and Payment Service spans from a single `POST /orders` request must share the same `trace_id`; Payment Service span must be a child of the Order Service outbound HTTP span.

### Trace / log correlation strategy

**Primary correlation anchors (existing):**

- `service` / `service.name` — shared across metrics (M7), logs (M9), traces (M10)
- Overlapping timestamps during request activity

**Optional M10 enhancement (recommended):**

Extend the M9 `JsonFormatter` (`services/*/app/logging.py`) to include `trace_id` and `span_id` in the JSON log body **when a valid OpenTelemetry span is active** (read from `trace.get_current_span().get_span_context()`). This enables manual Loki → trace pivot in Grafana (log line `trace_id` → Tempo lookup) without adopting OpenTelemetry logging.

**Rules:**

- `trace_id` and `span_id` are **JSON fields only** — never Loki stream labels (ADR-022 cardinality rules).
- Alloy `loki.process` must not promote `trace_id` or `span_id` to labels.
- Correlation is **assistive**, not guaranteed one-to-one with metrics (same precedent as M9 log/metric correlation).

### Loki label cardinality (unchanged from ADR-022)

**Authoritative Loki labels:** `namespace`, `service`, `container`, `level`

**Not Loki labels:** `trace_id`, `span_id`, `request_id`, `user_id`, `order_id`, `payment_id`, `path`, `method`, `status_code`, `pod`

### Tempo deployment

- **Image:** `grafana/tempo:2.7.2`
- **Mode:** Single-binary monolithic (all-in-one target) — smallest deployment for kind
- **Workload:** `Deployment`, **1 replica**
- **Service:** ClusterIP — port **3200** (query/HTTP), port **4317** (OTLP gRPC ingest)
- **Authentication:** None (local kind only; consistent with Loki `auth_enabled: false`)
- **Storage:** Non-persistent `emptyDir` at `/var/tempo` — consistent with ADR-019
- **Retention:** `72h` block retention (aligned with Loki M9 retention for kind learning); trace data lost on pod restart
- **Probes:** HTTP health on query port (`/ready` or `/status` per Tempo 2.7 defaults)
- **Resources (requests/limits):** `100m/256Mi` → `500m/512Mi` (conservative; tune during implementation)

Grafana `11.4.0` will not be upgraded in M10.

### Grafana integration

- **Datasource:** Tempo at `http://tempo:3200`, **uid:** `tempo`, `access: proxy`, `editable: false`
- **Default datasource:** Prometheus remains default (`isDefault: true` on Prometheus only) — M7 **KRP Service Health** and M9 **KRP Service Logs** dashboards unchanged
- **Provisioning:** Extend `grafana-datasources` ConfigMap (same pattern as Loki in M9)
- **Visualization:** Grafana **Explore** with Tempo datasource is the **primary** trace investigation interface
- **Optional:** Lightweight provisioned dashboard (e.g. **KRP Service Traces**, uid `krp-service-traces`) with links or simple trace search — complements, does not replace, Explore
- **Trace ↔ metrics:** Grafana built-in Tempo ↔ Prometheus correlation (service graphs / exemplars not required in M10)

### Cross-service verification scenario (M10 E2E)

**Trigger:** `POST /orders` to Order Service (in-cluster or port-forward).

**Expected trace hierarchy:**

```
[Client] HTTP POST /orders
  └── [order-service] FastAPI span
        ├── [order-service] SQLAlchemy span(s) — order insert (if SQLAlchemy instrumentation enabled)
        └── [order-service] HTTP client POST /payments
              └── [payment-service] FastAPI span
                    └── [payment-service] SQLAlchemy span(s) — payment insert (if enabled)
```

**Verification steps (manual, kind cluster `krp`):**

1. Confirm Tempo pod Ready; OpenTelemetry Collector pod Ready.
2. Execute `POST /orders` (creates order + payment via existing business flow).
3. In Grafana Explore → Tempo: locate trace by service `order-service` or recent trace search.
4. Confirm single `trace_id` spans Order Service and Payment Service.
5. Confirm parent/child relationship: Payment Service span nested under Order Service outbound HTTP span.
6. Confirm per-span durations visible (latency breakdown).
7. If `trace_id` logging implemented: optional Loki search for matching `trace_id` in JSON body.
8. Confirm M7/M9 dashboards and datasources remain functional.

### Helm chart design (M10 — implemented)

- **Chart version:** `krp-0.5.0` (follows M9 `0.4.0` milestone bump pattern)
- **New `values.yaml` blocks:** `tempo:` and `otelCollector:` with `enabled`, `image`, `replicas`, `service.ports`, `resources`, `probes`, `retention`
- **New templates:** `tempo-configmap.yaml`, `tempo-deployment.yaml`, `tempo-service.yaml`, `otel-collector-configmap.yaml`, `otel-collector-deployment.yaml`, `otel-collector-service.yaml`
- **Modified templates:** `grafana-datasources-configmap.yaml` (Tempo datasource), optionally `grafana-dashboards-configmap.yaml` and `grafana-deployment.yaml`, `_helpers.tpl` (image helpers), application ConfigMaps (OTEL env vars)
- **Conditional rendering:** `{{- if .Values.tempo.enabled }}` / `{{- if .Values.otelCollector.enabled }}` (default `true` when M10 ships)
- **Unchanged:** Alloy templates, Loki templates, Prometheus alert rules, `k8s/` reference manifests

### Testing strategy

**Automated (CI):**

- Unit tests: OTel setup/configuration; `service.name` matches `SERVICE_NAME`; optional `trace_id`/`span_id` in `JsonFormatter` when span active; httpx propagation behavior (mock/header inspection where practical)
- Helm: existing `helm lint` and `helm template`; verify `tempo.enabled=false` and `otelCollector.enabled=false` render paths
- Full pytest suite must remain passing (180 tests; 14 M10 tracing unit tests)

**Manual E2E (kind cluster `krp`):**

- Tempo Ready; OpenTelemetry Collector Ready
- All three services emit traces (e.g. `GET /health`, `GET /orders`, `GET /payments`)
- `POST /orders` produces cross-service trace (FR-025)
- SQLAlchemy spans visible if instrumentation enabled
- Grafana Tempo datasource healthy (`uid: tempo`)
- Per-service latency breakdown and trace hierarchy visible in Grafana Explore
- Optional `trace_id` correlation with Loki logs if implemented
- Cleanup: no stray test resources

**Not in M10 automated suite:** Tempo ingestion E2E, Collector health, Grafana Tempo datasource health (manual kind verification; same pattern as M8 alerts and M9 Loki).

### CI/CD

No changes to `.github/workflows/ci.yml` or `.github/workflows/cd.yml` in M10 unless an authoritative requirement emerges during implementation. CI already runs `helm lint`, `helm template`, and the full pytest suite; new Helm templates and Python dependencies are picked up automatically. CD does not require Tempo/Collector smoke checks (M8 Alertmanager and M9 Loki precedents). Optional future CD extension is out of M10 scope.

### Resource budget (single-node kind — conservative estimates)

| Component | CPU req / limit | Memory req / limit |
|-----------|-----------------|---------------------|
| Tempo | 100m / 500m | 256Mi / 512Mi |
| OTel Collector | 50m / 200m | 128Mi / 256Mi |
| Prometheus (existing) | 100m / 500m | 256Mi / 512Mi |
| Grafana (existing) | 100m / 500m | 128Mi / 256Mi |
| Alertmanager (existing) | 50m / 200m | 64Mi / 128Mi |
| Loki (existing) | 100m / 500m | 256Mi / 512Mi |
| Alloy (existing) | 50m / 200m | 128Mi / 256Mi |
| PostgreSQL (existing) | 100m / 500m | 256Mi / 512Mi |
| Three app services (existing) | 150m / 750m | 384Mi / 768Mi |
| **M10 incremental** | **~150m / ~700m** | **~384Mi / ~768Mi** |

Combined stack remains feasible on a typical kind single-node allocation (~4 CPU / 8Gi) but is heavier than M8; monitor pod restarts and OOM during implementation.

### Risks

| Risk | Mitigation |
|------|------------|
| Tempo not in approved-stack table | Document as Grafana-native trace backend required for FR-024/FR-025 visualization; parallels M9 Alloy rationale |
| kind memory pressure | Conservative requests/limits; 72h retention; `emptyDir`; single replicas |
| Double instrumentation (OTel + Prometheus middleware) | FastAPI OTel spans and Prometheus counters serve different signals; verify no duplicate span explosion on `/metrics` (exclude if needed) |
| httpx client lifecycle | `PaymentServiceClient` creates short-lived `httpx.Client`; ensure instrumentation applies to per-request and injected clients |
| Log format regression | Do not adopt OTel logging; extend `JsonFormatter` only for optional `trace_id`/`span_id` |
| High-cardinality Loki labels | Strict ADR-022 label rules; never label `trace_id` |
| Trace loss on Tempo restart | Accepted for kind (ADR-019 pattern) |
| User-service traces are single-service only | FR-025 verified via Order → Payment path; user-service still emits traces for completeness |

### Python dependencies (implemented)

Packages in root `pyproject.toml`:

- `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp-proto-grpc`
- `opentelemetry-instrumentation-fastapi`, `opentelemetry-instrumentation-httpx`
- `opentelemetry-instrumentation-sqlalchemy` (if recommended instrumentation adopted)

**Reason:**

Milestone 10 requires distributed traces via OpenTelemetry (FR-024) and cross-service correlation (FR-025) on a local kind cluster. Grafana Tempo is the natural trace backend for the existing Grafana-centric observability stack. A dedicated OpenTelemetry Collector keeps trace ingestion separate from M9 log collection (Alloy/Loki). W3C Trace Context over the existing synchronous Order → Payment `httpx` path satisfies the only cross-service communication boundary in the repository. Non-persistent Tempo storage matches the established kind learning pattern (ADR-019). Service naming alignment preserves metric/log/trace correlation without introducing production infrastructure.

**Status:** Accepted — implemented (Milestone 10)

**Verification:** Manual kind E2E on cluster `krp` completed — `POST /users` and `POST /orders` exercised; Order Service → Payment Service payment creation observed; cross-service trace with shared `trace_id` confirmed in Grafana Explore (Tempo datasource `uid: tempo`). Automated tracing unit tests (14) pass in CI; Tempo/Collector ingestion E2E not automated (per M8/M9 precedent).

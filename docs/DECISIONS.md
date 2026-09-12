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

---

## ADR-024 — SRE SLIs, SLOs, Error Budgets, and Alerting Architecture

**Date:** 2026-09-08

**Decision:**

Milestone 11 will define and implement SRE practices using **existing M7 Prometheus HTTP metrics** as the sole SLI source. SLIs, SLO targets, error-budget calculations, SLO-violation alerts, and a provisioned Grafana SRE dashboard will be delivered via **Prometheus recording rules**, **Prometheus alert rules**, and **embedded Grafana dashboard JSON** in the existing `helm/krp/` chart. No application code changes, no dedicated SLO backend, and no external SLO tooling will be introduced.

### Context

**Why Milestone 11 needs this decision:**

Milestone 11 (`docs/ROADMAP.md`) requires SLIs, SLOs, error-budget tracking, SRE Grafana dashboards, and SRE documentation. Requirements FR-028 (define SLIs/SLOs), FR-029 (track/visualize error budgets), and the SLO-violation portion of FR-027 (alerts for SLO violations) are **Planned** and assigned to Milestone 11. ADR-021 explicitly deferred P95 latency alerts, SLO alerts, and error-budget alerts from Milestone 8 to Milestone 11. No ADR previously defined SLI semantics, SLO targets, error-budget math, or dashboard/alert design.

**Verified existing infrastructure (Milestones 7–10):**

| Layer | Verified state |
|-------|----------------|
| **Application metrics (M7, ADR-017)** | All three services expose `http_requests_total` (Counter; labels: `service`, `method`, `handler`, `status`) and `http_request_duration_seconds` (Histogram; labels: `service`, `method`, `handler`) via identical `PrometheusMiddleware` in `services/*/app/metrics.py`. `/metrics` is excluded from request metrics. `status` values are numeric strings (e.g. `200`, `404`, `500`). |
| **Prometheus (M7, ADR-018)** | Static Service-DNS scrape of `user-service:8001`, `order-service:8002`, `payment-service:8003` at `/metrics`; scrape interval **15s**; rules loaded from ConfigMap `prometheus-rules` at `/etc/prometheus/rules/*.yml`; non-persistent `emptyDir` TSDB (ADR-019). |
| **Grafana (M7/M9)** | Provisioned Prometheus datasource (`uid: prometheus`); **KRP Service Health** dashboard (`uid: krp-services`) with availability (`up`), request rate, 5xx rate, P95 latency panels; **KRP Service Logs** dashboard (`uid: krp-service-logs`). Dashboards embedded in `helm/krp/templates/grafana-dashboards-configmap.yaml`. |
| **Alertmanager (M8, ADR-021)** | `prom/alertmanager:v0.27.0`; severity routing (`critical`, `warning`, `default`); local/null receivers only; failure-condition alerts `KRPServiceTargetDown` and `KRPHigh5xxErrorRate` in `prometheus-rules-configmap.yaml`. |
| **Logging / tracing (M9/M10)** | Loki, Alloy, Tempo, OpenTelemetry Collector — available for investigation but **not** SLI sources in M11. |

**Constraints relevant to SLO design:**

- Local **kind** cluster only (NFR-016); no cloud SLO backend.
- Prometheus TSDB on **non-persistent `emptyDir`** — pod restart **destroys all historical metrics** (ADR-019).
- Low traffic during learning and verification; high statistical variance on short windows.
- No Prometheus Operator, ServiceMonitor, or external SLO tooling without explicit approval.
- Helm (`helm/krp/`, current chart `0.5.0`) is the delivery mechanism; `k8s/` reference manifests are not modified.
- **Order-service probe limitation (verified):** `user-service` and `payment-service` probes use `GET /health`; `order-service` probes use `GET /orders` (no `/health` endpoint, ADR-020). Probe traffic is recorded on the same metric labels as business traffic for `order-service` and **cannot be excluded** with existing labels.

### Scope (M11 includes)

- SLI definitions and SLO targets for all three application services
- Prometheus **recording rules** for SLI, SLO comparison, and error-budget time series
- Prometheus **alert rules** for SLO violation, error-budget exhaustion, and P95 latency (deferred from M8)
- Provisioned Grafana **KRP SRE** dashboard (`uid: krp-sre`)
- Completion of FR-027 (SLO-violation alerting), FR-028, FR-029
- Helm chart version bump to `krp-0.6.0` at implementation
- Documentation updates at M11 closeout

### Scope (M11 excludes)

- Application code or metrics instrumentation changes (including adding `/health` to order-service)
- Incident simulation (Milestone 12), runbooks (Milestone 13), AI features (Milestones 14–17)
- External SLO tooling (Sloth, Pyrra, cloud SLO products)
- Multi-window burn-rate alerting (Google SRE production pattern)
- Prometheus Operator, ServiceMonitor, kube-state-metrics, node-exporter
- External alert notification integrations (Slack, email, PagerDuty)
- Changes to `k8s/` reference manifests
- Mandatory CI/CD workflow changes (M8/M9/M10 precedent)
- Automated SLO/Alertmanager E2E tests in CI (manual kind verification per M8/M10 precedent)
- Unrelated changes to Loki, Alloy, Tempo, Collector, or existing M7/M8 dashboards

### A. SLI types

Milestone 11 adopts **two SLIs per service**, derived from existing Prometheus metrics:

| SLI | Signal | Source metric | Role |
|-----|--------|---------------|------|
| **1. Request availability** | Ratio of HTTP requests that are **not server errors** | `http_requests_total` | **Primary SLO SLI** — drives error-budget calculation and availability SLO alerts |
| **2. P95 request latency** | 95th percentile of HTTP request duration | `http_request_duration_seconds` (histogram) | **Secondary SLO SLI** — latency objective and P95 alert |

**5xx error rate is not a separate SLO.** It is the arithmetic complement of request availability when success is defined as non-5xx (see §B). It will appear as a **diagnostic panel** on the SRE dashboard and remains the basis for the existing **failure-condition** alert `KRPHigh5xxErrorRate` (ADR-021), which is conceptually separate from SLO violation.

**Relationship between signals:**

```
request_availability = 1 - (5xx_requests / total_requests)
5xx_error_rate       = 1 - request_availability
```

Scrape-target availability (`up{job=...}`) remains on **KRP Service Health** for operational monitoring but is **not** the M11 SLO availability SLI. The SLO measures **request-level success**, not Prometheus scrape health.

### B. Request success semantics

**Decision:** A request is **successful** for the availability SLI if its `status` label is **not a 5xx** HTTP status code.

PromQL success filter (consistent with existing M7 dashboard and M8 alerts):

```
status!~"5.."
```

**4xx responses are treated as successful** for availability SLO purposes.

**Reasoning:**

- Aligns with existing repository semantics: M7 **5xx Error Rate** panel and M8 `KRPHigh5xxErrorRate` both use `status=~"5.."` for server errors only.
- 4xx responses (e.g. `404` not found, `409` conflict, `422` validation) reflect client or business-rule outcomes, not service unavailability.
- `status` values are numeric strings (`str(response.status_code)` in middleware); `5..` regex matches `500`–`599`.

**Caveat:** Unhandled exceptions recorded as `status="500"` correctly count as failures.

### C. Probe traffic strategy

**Verified probe behavior:**

| Service | Probe endpoint | Recorded metric labels (typical) | Excludable from SLI? |
|---------|----------------|----------------------------------|----------------------|
| `user-service` | `GET /health` | `handler="/health"`, `method="GET"`, `status="200"` | **Yes** — `handler!="/health"` |
| `payment-service` | `GET /health` | `handler="/health"`, `method="GET"`, `status="200"` | **Yes** — `handler!="/health"` |
| `order-service` | `GET /orders` | `handler="/orders"`, `method="GET"`, `status="200"` | **No** — indistinguishable from business `GET /orders` |

Probe period: `periodSeconds: 10` for both liveness and readiness on all three services (`helm/krp/values.yaml`).

**Decision:** **Asymmetric probe handling without application changes.**

1. **`user-service` and `payment-service`:** SLI recording rules and alerts **exclude** `handler="/health"` from numerators and denominators.
2. **`order-service`:** SLI recording rules and alerts **include all HTTP traffic** on all handlers. Probe traffic **cannot be excluded** and is an accepted measurement limitation for M11.
3. **All services:** `/metrics` is already excluded by middleware and does not appear in SLI data.

**Documented limitations:**

- `order-service` availability and latency SLIs are **biased toward success** by periodic probe `GET /orders` traffic (typically `200`), especially during low business traffic.
- FastAPI `/docs`, `/redoc`, and `/openapi.json` traffic is **included** in SLIs for all services (not excluded in M11).
- This design does **not** claim clean probe exclusion for `order-service`.

### D. SLO targets

Targets are chosen for a **local kind learning environment** with low traffic and non-persistent metrics — not production multi-nines.

| Service | SLI | SLO target | Meaning |
|---------|-----|------------|---------|
| `user-service` | Request availability | **99.0%** | ≥ 99% of measured requests (per §C filters) are non-5xx over the measurement window |
| `order-service` | Request availability | **99.0%** | Same; includes unavoidable probe traffic |
| `payment-service` | Request availability | **99.0%** | Same; excludes `/health` probe traffic |
| `user-service` | P95 latency | **≤ 500ms** (0.5s) | 95th percentile request duration ≤ 0.5 seconds over the measurement window |
| `order-service` | P95 latency | **≤ 500ms** (0.5s) | Same; includes probe latency on `GET /orders` |
| `payment-service` | P95 latency | **≤ 500ms** (0.5s) | Same; excludes `/health` probe traffic |

**Reasoning:**

- **99.0%** (not 99.9% or 99.99%) leaves a **1% error budget** that is observable on kind with manual failure injection, without requiring production traffic volumes.
- **500ms P95** aligns conceptually with NFR-002 (API response within 500ms under normal local conditions) while using an SLI that is already visualized on **KRP Service Health**.
- Uniform targets across services simplify the learning model; per-service differences are in probe handling (§C), not target percentages.

### E. Measurement window

**Decision:** Use a **6-hour rolling window** for all SLI, SLO compliance, and error-budget calculations.

PromQL expressions will use `[6h]` range vectors on `rate()` / `increase()`-based ratios (exact recording rules defined at implementation).

**Why not a 30-day rolling window:**

- Prometheus TSDB uses **non-persistent `emptyDir`** (ADR-019). A pod restart **wipes all history**, making a 30-day window meaningless on kind.
- Learning and manual verification sessions are short; practitioners need feedback within a single sitting.
- Low traffic on kind produces sparse data over long windows; a 6-hour window balances stability and responsiveness for demo workloads.

**Implication:** SLOs are **session-oriented learning SLOs**, not production contractual SLOs. Documentation must state that error-budget history does not survive Prometheus restarts.

### F. Error budget calculation

Error budgets apply to the **availability SLO only** (not P95 latency). P95 uses threshold-based SLO compliance and alerting (§H).

**Definitions (per service, over the 6-hour rolling window):**

Let:

- `T` = total request count in window (after probe filters in §C)
- `S` = successful (non-5xx) request count in window
- `SLI_avail` = `S / T` (request availability ratio, 0–1)
- `SLO_target` = `0.99`
- `E_allowed` = `1 - SLO_target` = **`0.01`** (1% of requests may be 5xx)

**Error budget consumed (ratio, 0 = none used, 1 = fully exhausted, >1 = over budget):**

```
error_budget_consumed = (1 - SLI_avail) / E_allowed
                      = (1 - SLI_avail) / 0.01
```

**Error budget remaining (ratio, clamped at 0):**

```
error_budget_remaining = max(0, 1 - error_budget_consumed)
```

**Equivalent form using 5xx share:**

```
5xx_ratio = 1 - SLI_avail
error_budget_remaining = max(0, 1 - (5xx_ratio / 0.01))
```

**Prometheus representation (planned recording rules, conceptual):**

| Recorded metric | Type | Labels | Purpose |
|-----------------|------|--------|---------|
| `krp:sli:availability:ratio` | gauge | `service` | Current `SLI_avail` over 6h window |
| `krp:slo:availability:target` | gauge | `service` | Constant `0.99` |
| `krp:slo:availability:error_budget:remaining` | gauge | `service` | `error_budget_remaining` (0–1) |
| `krp:slo:availability:error_budget:consumed` | gauge | `service` | `error_budget_consumed` |

**Grafana visualization:**

- **Stat / gauge panel:** error budget remaining as percentage (`error_budget_remaining * 100`)
- **Time series:** `SLI_avail` vs horizontal line at `0.99`
- **Stat panel:** budget consumed percentage with threshold coloring (green > 25% remaining, yellow 10–25%, red < 10%)

**P95 latency SLO compliance (no error-budget series):**

- Record `krp:sli:latency:p95:seconds` per service.
- Dashboard shows P95 vs **0.5s** target line.
- Alert fires when P95 > 0.5s (§H); no separate latency error-budget metric in M11.

### G. Recording rules

**Decision:** Use Prometheus **recording rules** in the existing `prometheus-rules` ConfigMap (new rule group alongside `krp-service-health` alerts).

**Naming convention:** `krp:<domain>:<metric>[:<window>]` — lowercase, colon-separated, consistent with Prometheus recording-rule style.

**Planned recording-rule categories (implementation phase):**

| Category | Planned metric name(s) | Labels | Purpose |
|----------|------------------------|--------|---------|
| Request volume | `krp:http_requests:rate5m` | `service` | Request rate for dashboard context |
| Availability SLI | `krp:sli:availability:ratio` | `service` | 6h non-5xx success ratio (with §C probe filters) |
| 5xx diagnostic | `krp:sli:errors:5xx:ratio` | `service` | `1 - availability` for dashboard display |
| Latency SLI | `krp:sli:latency:p95:seconds` | `service` | 6h P95 from histogram |
| SLO target | `krp:slo:availability:target` | `service` | Constant `0.99` |
| Error budget | `krp:slo:availability:error_budget:remaining` | `service` | Remaining budget (0–1) |
| Error budget | `krp:slo:availability:error_budget:consumed` | `service` | Consumed budget (≥0) |
| SLO compliance | `krp:slo:availability:compliant` | `service` | `1` if `SLI_avail >= 0.99`, else `0` |
| Latency compliance | `krp:slo:latency:p95:compliant` | `service` | `1` if P95 ≤ 0.5, else `0` |

Recording rules will be evaluated at Prometheus `evaluation_interval` (**15s**, same as scrape interval per `prometheus-configmap.yaml`).

**Probe filter implementation (recording rules):**

- `user-service`, `payment-service`: `http_requests_total{service="...", handler!="/health"}`
- `order-service`: `http_requests_total{service="order-service"}` (no handler exclusion)

### H. Alerting strategy

New alerts integrate with existing Alertmanager routing (ADR-021): `severity: critical` → `critical` receiver; `severity: warning` → `warning` receiver. All new M11 alerts use **`severity: warning`** unless noted. Existing failure-condition alerts are **unchanged**.

| Alert name | Type | Conceptual condition | `for` | Severity | Relationship to existing alerts |
|------------|------|---------------------|-------|----------|--------------------------------|
| **`KRPSLOAvailabilityViolation`** | SLO violation | `krp:sli:availability:ratio < 0.99` (6h SLI below target) | `10m` | `warning` | Fires on **SLO miss**, not catastrophe. `KRPHigh5xxErrorRate` fires at **>50%** 5xx — failure condition, not SLO. |
| **`KRPSLOErrorBudgetExhausted`** | Error budget | `krp:slo:availability:error_budget:remaining == 0` (budget fully consumed) | `5m` | `warning` | Subset/escalation of sustained SLO miss; indicates no remaining 1% budget. |
| **`KRPHighP95Latency`** | Latency (deferred from M8) | `krp:sli:latency:p95:seconds > 0.5` | `5m` | `warning` | Independent of 5xx rate. Deferred per ADR-021. |

**Explicit non-goals for M11 alerting:**

- No multi-window burn-rate alerts (e.g. 1h/6h/3d windows with burn factors).
- No `critical` severity for SLO alerts (reserve `critical` for `KRPServiceTargetDown`).
- No changes to `KRPServiceTargetDown` or `KRPHigh5xxErrorRate` expressions or severities.

**FR-027 completion:** `KRPSLOAvailabilityViolation` and `KRPSLOErrorBudgetExhausted` satisfy the **SLO-violation** portion of FR-027. `KRPServiceTargetDown` and `KRPHigh5xxErrorRate` continue to satisfy the **failure-condition** portion.

### I. Grafana dashboard design

**New provisioned dashboard:**

| Property | Value |
|----------|-------|
| **UID** | `krp-sre` |
| **Title** | `KRP SRE` |
| **Datasource** | Prometheus (`uid: prometheus`) |
| **Tags** | `krp`, `m11` |
| **Editable** | `false` (consistent with existing dashboards) |
| **Refresh** | `30s` |
| **Default time range** | `now-6h` to `now` (aligned with SLO window) |

**Per-service filtering:**

- Template variable `$service` — **custom** static list: `user-service`, `order-service`, `payment-service` (same pattern as **KRP Service Logs** dashboard, not Prometheus-query-driven).

**Primary panels (planned):**

| Panel | Type | Content |
|-------|------|---------|
| Availability SLI vs SLO | Time series | `krp:sli:availability:ratio` with threshold line at `0.99` |
| Error budget remaining | Gauge / stat | `krp:slo:availability:error_budget:remaining` as % |
| Error budget consumed | Gauge / stat | `krp:slo:availability:error_budget:consumed` as % |
| 5xx error rate (diagnostic) | Time series | `krp:sli:errors:5xx:ratio` |
| P95 latency vs SLO | Time series | `krp:sli:latency:p95:seconds` with threshold line at `0.5` |
| SLO compliance status | Stat | `krp:slo:availability:compliant` and `krp:slo:latency:p95:compliant` |
| Request rate (context) | Time series | `krp:http_requests:rate5m` |

**Difference from KRP Service Health (`uid: krp-services`):**

| KRP Service Health (M7) | KRP SRE (M11) |
|-------------------------|---------------|
| Operational health: scrape `up`, raw rates, raw 5xx %, raw P95 | SLO-oriented: SLI vs target, error budget, compliance |
| No SLO targets or budgets | Explicit 99% / 500ms targets |
| No `$service` variable; all services on one chart | Per-service focus via `$service` variable |
| `[5m]` rate windows | 6h SLI/SLO windows for budget semantics |

Both dashboards complement each other; M11 does not replace M7.

**Helm delivery (implementation phase):**

- Add `krp-sre.json` key to `helm/krp/templates/grafana-dashboards-configmap.yaml`
- Add volume `items` entry in `helm/krp/templates/grafana-deployment.yaml` (same pattern as `krp-service-logs.json`)

### J. Helm implementation plan

**Files to modify at implementation (not in this design phase):**

| File | Change |
|------|--------|
| `helm/krp/templates/prometheus-rules-configmap.yaml` | Add recording-rule group `krp-sre-slos`; add alert rules `KRPSLOAvailabilityViolation`, `KRPSLOErrorBudgetExhausted`, `KRPHighP95Latency` in a new or existing alert group |
| `helm/krp/templates/grafana-dashboards-configmap.yaml` | Add `krp-sre.json` dashboard |
| `helm/krp/templates/grafana-deployment.yaml` | Mount `krp-sre.json` in dashboards volume |
| `helm/krp/Chart.yaml` | Version `0.5.0` → `0.6.0` |
| `helm/krp/README.md` | SRE dashboard and SLO verification steps |

**Files not modified (M11):**

- `services/*/app/metrics.py`, `main.py` — no instrumentation changes
- `k8s/` — reference manifests unchanged
- `alertmanager-configmap.yaml` — existing routing sufficient
- `.github/workflows/ci.yml`, `cd.yml` — no mandatory CD smoke checks (M8–M10 precedent)
- Existing `krp-service-health.json`, `krp-service-logs.json` — unchanged

**Operational note (carried from ADR-021):** After Helm upgrade changing Prometheus rules ConfigMap, run `kubectl rollout restart deployment/prometheus -n krp` (no checksum annotation on Deployment).

### Alternatives considered

#### Alternative A — Direct PromQL in Grafana only

Compute SLI, SLO, and error-budget panels with inline PromQL in dashboard JSON.

| Pros | Cons |
|------|------|
| No recording rules | Cannot drive Prometheus alerts from the same definitions |
| Simpler initial YAML | Duplicated complex PromQL across panels; harder to test |
| | FR-027 SLO alerts still need PromQL in alert rules anyway |

**Rejected as sole approach.** Grafana-only calculations cannot satisfy FR-027 SLO-violation alerting. Dashboard may reference recording rules for consistency.

#### Alternative B — Prometheus recording rules + Grafana dashboard (chosen)

| Pros | Cons |
|------|------|
| Single source of truth for SLI/SLO/budget | More YAML in rules ConfigMap |
| Alerts and dashboards share recorded metrics | Requires Prometheus restart after rule changes |
| Fits existing `prometheus-rules` pattern | |
| No new infrastructure | |

**Accepted.** Matches M7/M8 architecture and repository audit recommendation.

#### Alternative C — External SLO tooling (Sloth, Pyrra, etc.)

| Pros | Cons |
|------|------|
| Production-grade SLO DSL | Not in approved technology stack |
| | Additional Deployment and dependencies |
| | Over-engineered for kind learning |

**Rejected.** Violates project constraint: no additional technologies without explicit approval.

#### Alternative D — Production multi-window burn-rate alerting

Google SRE-style alerts with multiple windows (e.g. 1h, 6h, 3d) and burn-rate factors.

| Pros | Cons |
|------|------|
| Industry best practice at scale | High complexity for a learning project |
| | Meaningless long windows with emptyDir TSDB |
| | Low traffic on kind produces noisy burn rates |
| | ADR-021 deferred simple alerts, not production burn rates |

**Rejected for M11.** Simple threshold alerts on recorded 6h SLI and error-budget metrics are sufficient for FR-027/FR-029 on kind.

### Consequences

#### Positive

- No new infrastructure components — reuses Prometheus, Alertmanager, Grafana
- SLIs derived from **existing** M7 metrics; no application changes
- Measurable, PromQL-defined SLOs and error budgets per service
- Completes deferred M8 alerting (P95, SLO) without altering failure-condition alerts
- Recording rules provide one definition for dashboards and alerts
- Fits Helm-centric deployment model and M7–M10 patterns

#### Tradeoffs / limitations

- **6-hour SLO window**, not production 30-day — intentional for kind
- **Prometheus emptyDir** — all SLO history lost on pod restart
- **Low traffic** — SLI ratios volatile with little request volume during verification
- **order-service probe contamination** — cannot exclude `GET /orders` probe traffic; SLIs biased toward success
- **user/payment `/health` exclusion** — imperfect if business traffic uses `/health`, but acceptable
- **Histogram default buckets** — not configured in repository; P95 is approximate
- **4xx counted as success** — availability SLO ignores client-error rate
- **No external notifications** — alerts route to null receivers (ADR-021)
- **Simplified alerting** — no burn-rate multi-window policies
- **FastAPI docs traffic** included in SLIs
- **Division by zero** — recording rules must guard `T = 0` (implementation detail)

### Implementation and verification plan

**Implementation sequence (future milestone work):**

1. Add recording rules to `helm/krp/templates/prometheus-rules-configmap.yaml` (`krp-sre-slos` group).
2. Add alert rules (`KRPSLOAvailabilityViolation`, `KRPSLOErrorBudgetExhausted`, `KRPHighP95Latency`).
3. Add `krp-sre.json` to `helm/krp/templates/grafana-dashboards-configmap.yaml`.
4. Update `helm/krp/templates/grafana-deployment.yaml` to mount new dashboard.
5. Bump `helm/krp/Chart.yaml` to `0.6.0`.
6. Run `helm lint helm/krp` and `helm template krp helm/krp`.
7. Run `pytest tests/` (ensure no regressions).
8. Deploy/upgraded chart on kind cluster `krp`.
9. `kubectl rollout restart deployment/prometheus -n krp` after rules change.
10. Generate traffic (`POST /users`, `POST /orders`); verify recording rules in Prometheus UI (`/graph` or `/api/v1/query`).
11. Verify **KRP SRE** dashboard panels show SLI, targets, and error budget.
12. Induce controlled 5xx traffic (e.g. scale `payment-service` to 0 + sustained `POST /orders`) — verify `KRPSLOAvailabilityViolation` / budget alerts fire and resolve (distinct from `KRPHigh5xxErrorRate` threshold).
13. Verify `KRPHighP95Latency` alert path if reproducible on kind (optional; document if not reproducible).
14. Confirm existing M7/M8/M9/M10 dashboards and alerts remain functional.
15. Update Milestone 11 documentation (ROADMAP, REQUIREMENTS, ARCHITECTURE, DEVELOPMENT, TESTING, README, helm README) at closeout.

**Verification:** Manual kind E2E on cluster `krp` completed (2026-09-08) — implementation steps 1–12 and 14 of the plan above. Helm chart `krp-0.6.0` deployed; Prometheus restarted after rules ConfigMap change; all 9 recording rules loaded with `health=ok`; healthy-state SLI/SLO/error-budget metrics verified for all three services; `KRPSLOAvailabilityViolation` and `KRPSLOErrorBudgetExhausted` manually verified for firing, Alertmanager receipt, and resolution after controlled user-service 5xx fault injection; **KRP SRE** dashboard provisioned and verified for healthy, degraded, and recovered states; M7/M8/M9/M10 regression verified. **Step 13 (`KRPHighP95Latency` firing):** rule loaded and inactive under healthy traffic; deliberate firing path **not demonstrated** on kind — documented as not reproducible within M11 scope without out-of-scope application or infrastructure changes (ADR-024 step 13 optional). **180 tests** unchanged; CD workflow unchanged.

**Reason:**

Milestone 11 requires defined SLIs, SLOs, and error budgets (FR-028, FR-029) and SLO-violation alerting (FR-027) on a local kind cluster without new infrastructure. Existing M7 HTTP metrics provide sufficient signals. Prometheus recording rules centralize SLI/SLO/budget math for Grafana and Alertmanager. A 6-hour rolling window and 99%/500ms targets are appropriate for non-persistent Prometheus on kind. Asymmetric probe handling documents the verified order-service limitation without application changes. Failure-condition alerts from M8 remain separate from SLO alerts.

**Status:** Accepted — implemented (Milestone 11)

**Verification:** Manual kind E2E on cluster `krp` completed — see verification summary above.

---

## ADR-025 — Incident Simulation Scope and Approach

**Date:** 2026-09-12

**Decision:**

Milestone 12 will deliver **reproducible incident simulation scenarios** for incident practice using **lightweight, Kubernetes-native and kubectl-based failure simulation** on the existing **kind** cluster (`krp`). Simulations will reuse the **existing observability stack** (Prometheus, Alertmanager, Grafana, Loki/Alloy, Tempo/OpenTelemetry Collector) without introducing new chaos-engineering platforms, application fault-injection endpoints, or network-fault infrastructure. Executable scripts or configurations, manual kind-based E2E verification, and documentation updates will satisfy FR-030 and NFR-014. Operational runbooks remain **Milestone 13** (FR-031).

### Context

**Why Milestone 12 needs this decision:**

Milestone 12 (`docs/ROADMAP.md`) requires reproducible failure scenarios for incident practice: define scenarios, create simulation scripts or configurations, verify observability captures failure symptoms, and document procedures. Requirements **FR-030** (incident simulation scenarios shall be executable) and **NFR-014** (failure scenarios shall be testable and reproducible) are **Planned** and assigned to Milestone 12. ADR-024 explicitly deferred incident simulation from Milestone 11 to Milestone 12. No ADR previously defined which failure types, mechanisms, or boundaries apply to M12.

**Verified existing infrastructure (Milestones 7–11):**

| Layer | Verified state |
|-------|----------------|
| **Application services** | `user-service` (8001), `order-service` (8002), `payment-service` (8003) on kind via `helm/krp/` (chart `0.6.0`). Shared PostgreSQL dependency. Order Service → Payment Service synchronous HTTP integration. **No committed application fault-injection endpoints.** |
| **Metrics / alerts (M7/M8/M11)** | Prometheus scrapes all three services; 9 SRE recording rules and 5 alert rules (`KRPServiceTargetDown`, `KRPHigh5xxErrorRate`, `KRPSLOAvailabilityViolation`, `KRPSLOErrorBudgetExhausted`, `KRPHighP95Latency`). Prometheus TSDB on non-persistent `emptyDir` (ADR-019). |
| **Dashboards (M7/M9/M11)** | **KRP Service Health** (`krp-services`), **KRP Service Logs** (`krp-service-logs`), **KRP SRE** (`krp-sre`). |
| **Logging (M9)** | Structured JSON stdout → Alloy → Loki; `service` and `level` labels. |
| **Tracing (M10)** | OTLP → OpenTelemetry Collector → Tempo; cross-service traces on `POST /orders` path. |
| **Alertmanager (M8)** | Local/null receivers only (ADR-021). |
| **Prior manual failure demonstrations** | M8: `kubectl scale deployment/... --replicas=0` for `KRPServiceTargetDown` and `KRPHigh5xxErrorRate`. M11: controlled 5xx fault path for SLO alerts (temporary application endpoint used for verification, **not** retained in committed code). |

**Repository audit findings (pre-M12):**

- No `scripts/` directory exists.
- No Chaos Mesh, Litmus, Toxiproxy, service mesh, or dedicated chaos-engineering tooling.
- No NetworkPolicies used for fault injection.
- ROADMAP major tasks mention network and latency scenarios, but the approved stack provides no minimal, reproducible mechanism for those without new infrastructure or application changes.

### Scope (M12 includes)

- **Lightweight, kubectl-based failure simulation** on the existing kind cluster
- **Initial incident scenarios** (see §Initial incident scenarios)
- **Simulation scripts or configurations** (e.g. shell scripts under `scripts/incidents/`) using approved mechanisms
- **Verification** that failure symptoms are observable in **metrics, logs, and traces** via existing observability
- **Documented simulation procedures** (recovery steps explicit in scripts and docs)
- Completion of **FR-030** and **NFR-014**
- Documentation updates at M12 closeout (ROADMAP, REQUIREMENTS, ARCHITECTURE, DEVELOPMENT, TESTING, README, helm README)

### Scope (M12 excludes / deferred)

**Explicitly out of scope for M12:**

| Category | Excluded approach |
|----------|-------------------|
| **Chaos platforms** | Chaos Mesh, Litmus, or similar chaos-engineering platforms |
| **Network fault tools** | Toxiproxy, service-mesh-based fault injection |
| **Application changes** | New fault-injection HTTP endpoints or latency-injection code in services |
| **Kubernetes network policy** | NetworkPolicies introduced solely for incident simulation |
| **Network partition** | Scenarios requiring dedicated network-partition infrastructure |
| **Artificial latency** | Latency injection requiring new infrastructure or application changes |
| **Runbooks** | Operational runbooks (Milestone 13, FR-031) |
| **AI features** | Milestones 14–17 |
| **New observability stack** | Additional metrics, logging, or tracing backends |
| **Mandatory CI/CD changes** | Automated failure-simulation tests in CI/CD unless later explicitly approved |
| **Data destruction** | Intentional deletion of PostgreSQL PVCs or other persistent data |

**Network and latency (ROADMAP mention, deferred):**

`docs/ROADMAP.md` lists network and latency failure scenarios among Milestone 12 major tasks. The current approved repository infrastructure does **not** provide a minimal, reproducible mechanism for those simulations without introducing unapproved technology or modifying application code. **Therefore network-partition and artificial-latency scenarios are explicitly deferred** from M12 implementation. This decision may be revisited in a future milestone if additional fault-injection infrastructure is explicitly approved.

### Initial incident scenarios

Milestone 12 will implement and verify at least the following scenario types:

| Scenario | Trigger (kubectl-based) | Primary affected component(s) |
|----------|-------------------------|-------------------------------|
| **Payment dependency failure** | Scale `payment-service` to 0 replicas | `order-service` (502/503/504 on `POST /orders`); `payment-service` target down |
| **PostgreSQL dependency failure** | Scale `postgres` Deployment to 0 or delete postgres Pod (PVC preserved) | All three application services (database connection errors) |
| **Application pod crash / restart** | `kubectl delete pod` on a selected application Pod | Chosen service (brief unavailability; Deployment recreates Pod) |

Additional kubectl-scale scenarios (e.g. `user-service` unavailable) may be included if they satisfy completion criteria without expanding scope. Scenarios must collectively demonstrate symptoms in **metrics, logs, and traces** where applicable.

### Simulation mechanisms

Approved mechanisms for M12 incident simulation:

| Mechanism | Use |
|-----------|-----|
| `kubectl scale deployment/<name> --replicas=0` | Dependency or service unavailable |
| `kubectl scale deployment/<name> --replicas=1` | Recovery |
| `kubectl delete pod` | Pod crash / forced restart simulation |
| Controlled HTTP traffic generation | Exercise failure paths (`curl`, scripts); e.g. sustained `POST /orders` during payment outage |

**Not approved for M12:** application-internal fault switches, chaos CRDs, network policy drops, traffic shaping sidecars, or latency-injection middleware.

### Simulation requirements

All M12 incident simulations must be:

| Requirement | Meaning |
|-------------|---------|
| **Reproducible** | Same trigger steps produce the same failure class on a healthy cluster (NFR-014) |
| **Reversible** | Explicit recovery steps restore the cluster to a working state |
| **Safe for local learning** | Suitable for a developer-owned kind cluster without production blast radius |
| **Recovery-documented** | Scripts and procedures state how to undo each simulation |
| **Non-destructive to persistent data** | **Do not delete PostgreSQL PVCs** or intentionally destroy persistent volumes; postgres Pod deletion or scale-to-zero is acceptable when the PVC is left intact |

### Observability expectations

Incident simulations will be evaluated through the **existing** observability infrastructure:

| Signal | Source | M12 use |
|--------|--------|---------|
| **Metrics** | Prometheus (`http_requests_total`, `up`, M11 recording rules) | Primary symptom detection; rates, availability, error budget |
| **Dashboards** | Grafana (`krp-services`, `krp-sre`, `krp-service-logs`) | Visual degradation and recovery |
| **Logs** | Loki via Alloy | ERROR/WARNING lines, connection failures, dependency errors |
| **Traces** | Tempo via OpenTelemetry Collector | Cross-service failure on order → payment path where traffic is generated |
| **Alerts** | Prometheus → Alertmanager | Use existing rules where timing permits |

**Alert timing caveats:**

- Alert firing depends on Prometheus **scrape interval** (15s) and each rule's **`for` duration** (e.g. `KRPServiceTargetDown` 1m, `KRPHigh5xxErrorRate` 2m, SLO alerts 5–10m).
- **Transient failures** (e.g. brief Pod restart) are **not guaranteed** to trigger alerts; documentation must not claim they always will.
- Verification must **distinguish** between theoretically expected alert behavior and behavior **actually demonstrated** during manual kind E2E testing (consistent with ADR-024 step 13 precedent for `KRPHighP95Latency`).

### Milestone 13 boundary

| Milestone | Responsibility |
|-----------|----------------|
| **M12** | Create **executable incident scenarios**, verify observability captures symptoms, document **simulation procedures** (how to trigger and recover) |
| **M13** | **Operational runbooks** for common incidents (FR-031) — response playbooks, investigation steps, escalation context |

M12 simulation scripts and procedures are **not** formal runbooks. This ADR does not define runbook content, structure, or ownership. M12 documentation should describe how to run and verify scenarios; M13 will translate incident practice into operational runbooks.

### Verification approach

**Primary verification:** **Manual kind-based E2E** on cluster `krp`, consistent with Milestones 8–11 precedent.

| Aspect | M12 approach |
|--------|--------------|
| **Automated pytest** | Not required solely for M12 |
| **CI/CD workflow changes** | Not required unless later explicitly approved |
| **Per-scenario checklist** | Trigger → observe metrics, logs, traces → recover → confirm resolution |
| **Regression** | Existing **180 tests** must continue to pass; no application or Helm template changes required for core scenarios |

### Alternatives considered

#### Alternative A — Dedicated chaos-engineering platform (Chaos Mesh, Litmus)

| Pros | Cons |
|------|------|
| Rich network/latency/crash scenarios | Not in approved technology stack |
| Industry-standard chaos tooling | Substantially expands project scope and learning surface |
| | Additional cluster components and RBAC |
| | Over-engineered for kind incident **practice** |

**Rejected for M12.** The goal is reproducible incident practice on existing infrastructure, not a full chaos-engineering platform.

#### Alternative B — Application fault-injection endpoints

| Pros | Cons |
|------|------|
| Precise 5xx/latency control | Requires application code changes |
| Reproducible SLO/latency demos | M11 used a temporary endpoint that was removed post-verification |
| | Blurs application vs operations concerns |

**Rejected for M12.** Kubernetes-native mechanisms already support multiple realistic failure scenarios without modifying service code.

#### Alternative C — Toxiproxy or NetworkPolicy-based network faults

| Pros | Cons |
|------|------|
| Network partition and latency simulation | New infrastructure or manifest types not in current stack |
| | NetworkPolicies solely for simulation add complexity without prior precedent |

**Deferred.** May be revisited if explicitly approved in a future milestone.

### Consequences

#### Positive

- Reuses existing kind cluster, Helm deployment, and full observability stack (M7–M11)
- No new technologies or application changes for core scenarios
- kubectl-based approach is transparent, reversible, and appropriate for learning
- Clear boundary with M13 runbooks and M14+ AI features
- Satisfies FR-030 and NFR-014 with minimal scope expansion

#### Tradeoffs / limitations

- **No network-partition or latency scenarios** in M12 without future approval
- **Alert firing not guaranteed** for short-lived failures
- **SLO alerts** require sustained conditions (5–10m); quick demos rely on M8 failure alerts
- **Prometheus emptyDir** — metric history lost on Prometheus pod restart mid-scenario
- **Manual verification only** — no automated regression of incident scripts in CI unless later approved
- **PostgreSQL scale-to-zero** affects all services simultaneously — realistic but broad blast radius on a small cluster

### Implementation and verification plan

**Implementation sequence (future milestone work):**

1. Create `scripts/incidents/` with per-scenario scripts (trigger, traffic generation helpers, recovery).
2. Add `scripts/incidents/README.md` with scenario catalog and observability checklist.
3. Run manual kind E2E per scenario: verify symptoms in metrics, logs, and traces; recover; confirm resolution.
4. Update Milestone 12 documentation (ROADMAP, REQUIREMENTS, ARCHITECTURE, DEVELOPMENT, TESTING, README, helm README) at closeout.
5. Mark FR-030 and NFR-014 **Implemented** in `docs/REQUIREMENTS.md`.

**Verification:** Manual kind E2E on cluster `krp` completed — **PostgreSQL dependency failure** scenario verified: postgres scaled to 0 (PVC preserved); postgres-exporter remained running; `pg_up=0`; `up{job="postgres-exporter"}=1`; `KRPPostgresDown` fired and resolved via Alertmanager; **KRP PostgreSQL** dashboard reflected outage and recovery; order-service database connection failures during outage and recovery after postgres restore. Payment dependency failure and pod-crash scripts implemented per ADR-025; **manual kind E2E not documented for those scenarios in M12 closeout**. Network/latency scenarios deferred. **180 tests** unchanged; CD workflow unchanged.

**Reason:**

The existing repository already provides sufficient **Kubernetes-native mechanisms** (`kubectl scale`, `kubectl delete pod`, controlled HTTP traffic) for multiple realistic failure scenarios on a three-service microservices stack with shared PostgreSQL. Introducing a chaos-engineering platform would substantially expand project scope beyond FR-030/NFR-014 and the learning objective of **incident practice**. M12 should build upon existing infrastructure and observability capabilities (metrics, logs, traces, dashboards, alerts) rather than new fault-injection technology. Deferring network and latency scenarios avoids unapproved dependencies while keeping the ROADMAP completion criteria achievable through dependency failures, database outages, and pod crash simulations.

**Status:** Accepted — implemented (Milestone 12)

**Verification:** Manual kind E2E on cluster `krp` completed — see verification summary above.

---

## ADR-026 — PostgreSQL Monitoring with postgres-exporter

**Date:** 2026-09-12

**Decision:**

Milestone 12 will add PostgreSQL health and activity monitoring using **`prometheuscommunity/postgres-exporter`** (`quay.io/prometheuscommunity/postgres-exporter:v0.16.0`) deployed via `helm/krp/`. The exporter connects to the existing PostgreSQL Service (`postgres:5432`, database `k8s_reliability`) using credentials from the existing `postgres-credentials` Secret (`DATA_SOURCE_USER`, `DATA_SOURCE_PASS`, `DATA_SOURCE_URI` without embedded credentials). Prometheus will scrape `postgres-exporter:9187/metrics`. Two PostgreSQL-specific alert rules and a provisioned Grafana **KRP PostgreSQL** dashboard (`uid: krp-postgres`) will distinguish exporter scrape health from database connectivity.

### Context

Milestone 12 incident simulation requires observable PostgreSQL dependency failures. Application HTTP metrics and `KRPServiceTargetDown` do not detect database outages when application scrape targets remain up. The `postgres-exporter` exposes `pg_up`, refreshed on each scrape, indicating whether the exporter can connect to PostgreSQL.

### Scope (M12 includes)

- `postgres-exporter` Deployment and Service in `helm/krp/`
- Prometheus scrape job `postgres-exporter`
- Alert rules `KRPPostgresExporterDown` and `KRPPostgresDown` in `krp-postgres-health` group
- Grafana **KRP PostgreSQL** dashboard (`uid: krp-postgres`)
- Helm chart version bump to `krp-0.7.0`
- Credentials via existing `postgres-credentials` Secret — no plaintext passwords in templates

### Scope (M12 excludes)

- Application code changes
- PostgreSQL server configuration changes
- New database users or RBAC beyond existing Secret
- Runbooks (Milestone 13)
- CD workflow changes or automated postgres-exporter smoke tests

### Alert semantics

| Alert | Expression | Meaning |
|-------|------------|---------|
| `KRPPostgresExporterDown` | `up{job="postgres-exporter"} == 0` | Prometheus cannot scrape postgres-exporter |
| `KRPPostgresDown` | `up{job="postgres-exporter"} == 1 and pg_up == 0` | Exporter is reachable but cannot connect to PostgreSQL |

Both alerts use `severity: critical` and `for: 1m`, consistent with `KRPServiceTargetDown`.

### Key metrics

- `pg_up` — database connectivity from exporter (primary failure signal)
- `pg_stat_database_numbackends` — active connections
- `pg_stat_database_xact_commit` / `pg_stat_database_xact_rollback` — transaction counters
- `pg_database_size_bytes` — database size

### Consequences

#### Positive

- Clear distinction between exporter failure and database failure
- Reuses existing PostgreSQL Service and Secret
- Supports PostgreSQL dependency failure incident simulation with dedicated dashboard and alerts
- Fits existing Prometheus → Alertmanager → Grafana pattern

#### Tradeoffs / limitations

- `pg_up` reflects exporter connectivity only — not application-level query health
- Exporter adds a cluster workload; single replica on kind
- Prometheus/Alertmanager/Grafana use non-persistent storage (ADR-019)
- `KRPPostgresExporterDown` not separately demonstrated in M12 E2E (postgres-exporter remained running during verified outage)

**Reason:**

PostgreSQL is a shared dependency for all application services. Dedicated database metrics and `pg_up` provide a direct, reproducible signal for database outage simulation that complements application HTTP metrics. The two-alert pattern avoids conflating exporter scrape failure with database unavailability.

**Status:** Accepted — implemented (Milestone 12)

**Verification:** Manual kind E2E on cluster `krp` during PostgreSQL dependency failure simulation — `pg_up` transitioned to 0 while `up{job="postgres-exporter"}` remained 1; `KRPPostgresDown` fired and resolved via Alertmanager; **KRP PostgreSQL** dashboard reflected outage and recovery.

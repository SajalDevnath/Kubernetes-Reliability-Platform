# Project Roadmap

> **Last updated:** Milestone 7 — Metrics and Monitoring (in progress)

This roadmap defines the complete progression of the Kubernetes Reliability Platform. Work proceeds strictly in milestone order unless explicitly instructed otherwise.

---

## Milestone 0 — Engineering Foundation

**Objective:** Establish project structure, documentation, rules, and development workflow.

**Major Tasks:**
- [x] Create repository structure
- [x] Create project documentation (`docs/`)
- [x] Create Cursor rules (`.cursor/rules/`)
- [x] Create `AGENTS.md`
- [x] Create `PROJECT_MASTER_SPECIFICATION.md`
- [x] Create `.gitignore`, `.env.example`, `README.md`
- [x] Define testing strategy
- [x] Define security rules
- [x] Define complete roadmap

**Completion Criteria:**
- All foundation files exist and are internally consistent
- No application code, Dockerfiles, or infrastructure manifests exist
- Roadmap covers all planned milestones
- Cursor rules align with AGENTS.md

**Status:** COMPLETE

---

## Milestone 1 — Application Foundation

**Objective:** Set up Python project structure, dependency management with uv, and a single FastAPI service skeleton.

**Major Tasks:**
- [x] Initialize Python project with uv
- [x] Define package structure for microservices
- [x] Create FastAPI application skeleton
- [x] Set up PostgreSQL connection with SQLAlchemy
- [x] Implement health check endpoint
- [x] Add initial unit tests
- [x] Document local development setup

**Completion Criteria:**
- A FastAPI service starts locally
- Health check endpoint responds
- Database connection is configured
- Unit tests pass
- Development workflow is documented

**Status:** COMPLETE

---

## Milestone 2 — Microservices

**Objective:** Implement User, Order, and Payment services with REST APIs and service-to-service communication.

**Major Tasks:**
- [x] Implement User Service CRUD APIs
- [x] Implement Order Service CRUD APIs (no Payment integration yet)
- [x] Implement Order Service → Payment Service integration
- [x] Implement Payment Service CRUD APIs
- [x] Define Payment Service foundation (ORM model, schemas, package structure)
- [x] Define Pydantic schemas for Payment endpoints
- [x] Add integration tests (User, Order, and Payment services)
- [x] Add end-to-end tests for cross-service flows

**Completion Criteria:**
- All three services run locally
- REST APIs are functional and validated
- Order → Payment communication works
- Integration and E2E tests pass

**Exit Validation:**
- [x] All three services run locally
- [x] REST APIs are functional and validated
- [x] Order → Payment communication works
- [x] Integration and E2E tests pass (86 unit, 36 integration, 2 E2E — 124 total)

**Status:** COMPLETE

> **Note:** Milestone 2 verified against PostgreSQL — User, Order, and Payment Service CRUD APIs; Order → Payment HTTP integration; and E2E cross-service workflows (user → order → payment). Test totals: **86 unit**, **36 integration**, **2 E2E** (**124 total**).

---

## Milestone 3 — Docker

**Objective:** Containerize all services and orchestrate locally with Docker Compose.

**Major Tasks:**
- [x] Create Dockerfiles for each service
- [x] Create Docker Compose configuration
- [x] Include PostgreSQL in Compose stack
- [x] Verify container health checks
- [x] Document container workflow

**Completion Criteria:**
- All services run via Docker Compose
- Services communicate within the Compose network
- Health checks pass in containers

**Exit Validation:**
- [x] All services run via Docker Compose (`docker-compose.yml` — postgres, user-service, order-service, payment-service)
- [x] Services communicate within the Compose network (`krp-network`; Order → Payment via `http://payment-service:8003`)
- [x] Health checks pass in containers (PostgreSQL `pg_isready`; User/Payment `/health`; Order `GET /orders`)
- [x] Existing pytest suite passes with no regression (86 unit, 36 integration, 2 E2E — 124 total)

**Status:** COMPLETE

> **Note:** Milestone 3 verified — Dockerfiles for User, Order, and Payment services; `docker-compose.yml` with PostgreSQL 16, named volume, service-name networking, and container healthchecks. Compose workflow documented in `docs/DEVELOPMENT.md`. Order → Payment communication verified over Compose DNS. Payment status updates remain owned by Payment Service; Order status is not automatically synchronized when a payment becomes `successful`.

---

## Milestone 4 — Kubernetes

**Objective:** Deploy services to a local Kubernetes cluster using kind.

**Major Tasks:**
- [x] Set up kind cluster
- [x] Create Kubernetes Deployments and Services
- [x] Create ConfigMaps and Secrets
- [x] Configure liveness and readiness probes
- [x] Set resource limits
- [x] Verify service discovery and communication

**Completion Criteria:**
- All services deploy to kind cluster
- Probes function correctly
- Services are accessible within the cluster
- Configuration is externalized

**Exit Validation:**
- [x] kind cluster `krp` (context `kind-krp`) and namespace `krp` verified
- [x] Plain YAML manifests under `k8s/` applied — postgres, user-service, payment-service, order-service
- [x] All four workloads Running, READY 1/1, RESTARTS 0
- [x] PostgreSQL `postgres:16` with PVC `postgres-data` (1Gi); ClusterIP Service on port 5432
- [x] Application ClusterIP Services: user-service:8001, order-service:8002, payment-service:8003
- [x] ConfigMaps (`user-service-config`, `payment-service-config`, `order-service-config`) and shared Secret `postgres-credentials` in use
- [x] Local images (`krp-*-service:local`, `imagePullPolicy: Never`) loaded via `kind load docker-image`
- [x] Probes verified: postgres `pg_isready`; user/payment `GET /health`; order `GET /orders` (no `/health` endpoint)
- [x] In-cluster DNS and Order → Payment via `http://payment-service:8003` verified
- [x] Database-backed workflow verified: user creation, order creation, payment record creation
- [x] Existing pytest suite passes with no regression (86 unit, 36 integration, 2 E2E — 124 total)
- [x] Docker Compose parity verified after Kubernetes work

**Status:** COMPLETE

> **Note:** Milestone 4 verified — plain Kubernetes manifests in `k8s/` on kind cluster `krp`, namespace `krp`. PostgreSQL Deployment + 1Gi PVC; application Deployments with ConfigMaps, `postgres-credentials` Secret (local placeholder `change_me`), liveness/readiness probes, and resource requests/limits. Manual in-cluster verification (no automated Kubernetes pytest suite). Helm packaging completed in Milestone 5 (`helm/krp/`). Payment status updates remain owned by Payment Service; Order status is not automatically synchronized when a payment becomes `successful`.

---

## Milestone 5 — Helm

**Objective:** Package Kubernetes deployments as Helm charts.

**Major Tasks:**
- [x] Create Helm chart structure
- [x] Parameterize deployments with values files
- [x] Support environment-specific configuration
- [x] Document Helm deployment workflow

**Completion Criteria:**
- Services deploy via Helm install/upgrade
- Values files support configuration changes
- Helm charts are documented

**Exit Validation:**
- [x] Umbrella chart `helm/krp/` (`krp-0.1.0`) packages postgres, user-service, payment-service, and order-service
- [x] `values.yaml` baseline defaults; `values-local.yaml` for non-sensitive local kind overrides
- [x] `postgres.storage.existingClaim` supports reusing an existing PVC (`postgres-data`) for M4 → M5 migration
- [x] `helm lint helm/krp` — 0 chart(s) failed
- [x] `helm template` verified for default values (creates PVC) and `values-local.yaml` (reuses existing PVC, no PVC resource rendered)
- [x] M4 application resources removed before first Helm install; PostgreSQL PVC `postgres-data` preserved (Bound, 1Gi, ReadWriteOnce)
- [x] `helm upgrade --install krp helm/krp -n krp -f helm/krp/values.yaml -f helm/krp/values-local.yaml` — release `krp` revision 1 deployed
- [x] Helm upgrade verified (`userService.replicas=2` → revision 2, `2/2`; restored to baseline → revision 3, all deployments `1/1`)
- [x] All four workloads Running; PostgreSQL 0 restarts after stabilization
- [x] In-cluster connectivity verified (`user-service` `/health`, `payment-service` `/health`, `order-service` `/orders`)
- [x] API workflow verified via port-forward — order creation (ID 3) and payment creation (ID 4); existing orders/payments from M4 retained
- [x] Plain `k8s/` manifests retained as M4 reference implementation (not removed or replaced)

**Status:** COMPLETE

> **Note:** Milestone 5 verified — Helm chart `helm/krp/` deploys the same topology as M4 `k8s/` manifests on kind cluster `krp`, namespace `krp`. Configuration parameterized via `values.yaml` and `values-local.yaml` (including `existingClaim: postgres-data` to preserve PostgreSQL data during migration). Manual Helm verification (no automated Helm pytest suite). Payment status updates remain owned by Payment Service; Order status is not automatically synchronized when a payment becomes `successful`.

---

## Milestone 6 — CI/CD

**Objective:** Automate build, test, and deploy with GitHub Actions.

**Major Tasks:**
- [x] Create CI pipeline (lint, test, build)
- [x] Create CD pipeline (deploy to kind)
- [x] Review and document CI/CD credential handling (no GitHub Secrets required for placeholder credentials)
- [x] Document CI/CD workflow

**Completion Criteria:**
- CI runs on pull requests
- CD deploys on merge to main
- CI/CD credential handling is reviewed and documented; no GitHub Secrets are required for the current placeholder-credential implementation

**Exit Validation:**
- [x] `.github/workflows/ci.yml` — triggers on `pull_request`; `permissions: contents: read`
- [x] CI: Python 3.10, `uv sync --dev --frozen`, Ruff lint, full pytest suite (124 tests) with PostgreSQL 16 service container
- [x] CI: Docker build validation for `krp-user-service:ci`, `krp-order-service:ci`, `krp-payment-service:ci`
- [x] CI: `helm lint helm/krp` and `helm template` validation
- [x] `.github/workflows/cd.yml` — triggers on `push` to `main`; `permissions: contents: read`
- [x] CD: builds three service images, installs kind v0.33.0, creates ephemeral kind cluster `krp` on the GitHub-hosted runner
- [x] CD: loads `:ci` images via `kind load docker-image`; deploys `helm/krp/` with `values.yaml` and `--set images.*.tag=ci` (not `values-local.yaml`)
- [x] CD: `kubectl wait` for postgres, user-service, payment-service, order-service; in-cluster smoke tests (`user-service` `/health`, `payment-service` `/health`, `order-service` `/orders`)
- [x] CD: `kind delete cluster --name krp` with `if: always()` — cluster is disposable; not a production deployment
- [x] GitHub Actions CI workflow verified on pull request
- [x] GitHub Actions CD workflow verified on push to `main`
- [x] CI/CD credential handling reviewed and documented (`docs/DEVELOPMENT.md`, `docs/ARCHITECTURE.md`); no GitHub Secrets required for placeholder PostgreSQL credential (`change_me`); no registry push

**Status:** COMPLETE

> **Note:** Milestone 6 verified — GitHub Actions CI on pull requests and CD on pushes to `main`. CD deploys to an ephemeral kind cluster created on the runner (not a developer's local `kind-krp` cluster). Images are built and loaded into kind without a container registry. PostgreSQL credentials remain the documented local-development placeholder (`change_me`). Payment status updates remain owned by Payment Service; Order status is not automatically synchronized when a payment becomes `successful`.

---

## Milestone 7 — Metrics and Monitoring

**Objective:** Implement Prometheus metrics collection and Grafana dashboards.

**Major Tasks:**
- [x] Instrument services with Prometheus metrics
- [x] Deploy Prometheus to the cluster
- [x] Deploy Grafana with dashboards
- [x] Write PromQL queries for key metrics
- [x] Document monitoring setup
- [x] Extend CD pipeline with monitoring smoke checks

**Completion Criteria:**
- Services expose `/metrics` endpoints
- Prometheus scrapes all services
- Grafana dashboards visualize service health

**Exit Validation:**
- [x] All three services expose `GET /metrics` with `http_requests_total` and `http_request_duration_seconds` (prometheus-client)
- [x] Prometheus deployed via `helm/krp/` (`prom/prometheus:v2.55.1`); static Service-DNS scrape targets for user-service, order-service, payment-service
- [x] Grafana deployed via `helm/krp/` (`grafana/grafana:11.4.0`); provisioned Prometheus datasource (`http://prometheus:9090`); **KRP Service Health** dashboard (UID `krp-services`)
- [x] Non-persistent `emptyDir` storage for Prometheus and Grafana
- [x] Order Service continues using `GET /orders` for Kubernetes probes (no `/health` endpoint added)
- [x] Metrics unit tests added (15 tests; **139 total** — 101 unit, 36 integration, 2 E2E)
- [x] CD workflow extended: `kubectl wait` for prometheus and grafana; in-cluster smoke tests for Prometheus readiness, Grafana health, `/metrics` exposition, and Prometheus target UP status (bounded retry)
- [x] Local kind verification complete (deploy, targets UP, dashboard panels return data)
- [ ] GitHub Actions CD end-to-end verification with monitoring smoke checks (**pending** — requires push to `main`)

**Status:** IN PROGRESS (implementation complete; final verification gate pending)

> **Note:** Milestone 7 implementation verified locally on kind cluster `krp`. Application metrics use low-cardinality labels (`service`, `method`, `handler` route template, `status`). Prometheus uses static scrape config (no ServiceMonitor, Prometheus Operator, or exporters). Grafana admin credentials remain local-development placeholders (`admin` / `change_me`). Payment status updates remain owned by Payment Service; Order status is not automatically synchronized when a payment becomes `successful`.

---

## Milestone 8 — Alerting

**Objective:** Configure Alertmanager for alert routing and notification.

**Major Tasks:**
- Define alerting rules in Prometheus
- Deploy and configure Alertmanager
- Create alert routes and receivers
- Test alert firing and resolution
- Document alerting setup

**Completion Criteria:**
- Alerts fire on defined conditions
- Alertmanager routes alerts correctly
- Alert resolution is observable

**Status:** NOT STARTED

---

## Milestone 9 — Logging

**Objective:** Implement centralized logging with Loki.

**Major Tasks:**
- Configure structured logging in services
- Deploy Loki to the cluster
- Configure log collection and shipping
- Create Grafana log dashboards
- Document logging setup

**Completion Criteria:**
- All service logs are aggregated in Loki
- Logs are searchable in Grafana
- Log correlation with metrics is possible

**Status:** NOT STARTED

---

## Milestone 10 — Distributed Tracing

**Objective:** Implement distributed tracing with OpenTelemetry.

**Major Tasks:**
- Instrument services with OpenTelemetry SDK
- Deploy trace collector
- Configure trace export and visualization
- Verify cross-service trace correlation
- Document tracing setup

**Completion Criteria:**
- Traces span across service boundaries
- Traces are visible in the observability stack
- Latency breakdown is available per service

**Status:** NOT STARTED

---

## Milestone 11 — SRE Practices

**Objective:** Define and implement SRE practices including SLIs, SLOs, and error budgets.

**Major Tasks:**
- Define SLIs for each service
- Set SLO targets
- Implement error budget tracking
- Create SRE dashboards in Grafana
- Document SRE practices

**Completion Criteria:**
- SLIs and SLOs are defined and measurable
- Error budgets are tracked and visualized
- SRE documentation is complete

**Status:** NOT STARTED

---

## Milestone 12 — Incident Simulation

**Objective:** Create reproducible failure scenarios for incident practice.

**Major Tasks:**
- Define failure scenarios (network, latency, crashes, dependency failures)
- Create simulation scripts or configurations
- Verify observability captures failure symptoms
- Document simulation procedures

**Completion Criteria:**
- Multiple failure scenarios are executable
- Failures produce observable symptoms in metrics, logs, and traces
- Simulation procedures are documented

**Status:** NOT STARTED

---

## Milestone 13 — Runbooks

**Objective:** Create runbooks for common incident response procedures.

**Major Tasks:**
- Document runbooks for each failure scenario
- Include investigation steps using observability tools
- Define escalation procedures
- Link runbooks to alerts

**Completion Criteria:**
- Runbooks exist for all simulated failure scenarios
- Runbooks reference specific metrics, logs, and traces
- Runbooks are tested against simulations

**Status:** NOT STARTED

---

## Milestone 14 — AI Incident Analyzer

**Objective:** Build an AI-assisted root cause analysis tool.

**Major Tasks:**
- Integrate LLM API
- Design structured prompting for incident analysis
- Feed observability data (metrics, logs, traces) to the analyzer
- Generate RCA reports
- Document AI analyzer usage

**Completion Criteria:**
- AI analyzer produces useful RCA for simulated incidents
- Analysis references real observability data
- Output is structured and actionable

**Status:** NOT STARTED

---

## Milestone 15 — AI Tool Calling

**Objective:** Enable AI to query Kubernetes and observability APIs via tool calling.

**Major Tasks:**
- Define tool schemas for Kubernetes API queries
- Define tool schemas for observability queries
- Implement tool calling framework
- Restrict AI to read-only operations initially
- Document tool calling capabilities and limits

**Completion Criteria:**
- AI can query pod status, logs, and metrics via tools
- Tool access is read-only and auditable
- Safety guardrails are enforced

**Status:** NOT STARTED

---

## Milestone 16 — RAG

**Objective:** Implement retrieval-augmented generation for runbook and documentation access.

**Major Tasks:**
- Index runbooks and documentation
- Implement retrieval pipeline
- Integrate RAG with AI analyzer
- Verify relevant context retrieval
- Document RAG setup

**Completion Criteria:**
- AI retrieves relevant runbook sections for incidents
- RAG improves RCA quality over raw prompting
- Retrieval is tested against known scenarios

**Status:** NOT STARTED

---

## Milestone 17 — Controlled Remediation

**Objective:** Enable AI-recommended remediation with mandatory human approval.

**Major Tasks:**
- Define safe remediation actions (restart pod, scale deployment)
- Implement human approval workflow
- Enforce guardrails against destructive operations
- Audit all remediation actions
- Document remediation procedures and safety limits

**Completion Criteria:**
- AI recommends remediation actions
- Human approval is required before execution
- Destructive operations are blocked
- All actions are logged and auditable

**Status:** NOT STARTED

---

## Progression Summary

```
Milestone 0  → Engineering Foundation        [COMPLETE]
Milestone 1  → Application Foundation      [COMPLETE]
Milestone 2  → Microservices               [COMPLETE]
Milestone 3  → Docker                      [COMPLETE]
Milestone 4  → Kubernetes                  [COMPLETE]
Milestone 5  → Helm                        [COMPLETE]
Milestone 6  → CI/CD                       [COMPLETE]
Milestone 7  → Metrics and Monitoring      [IN PROGRESS]
Milestone 8  → Alerting                    [NOT STARTED]
Milestone 9  → Logging                     [NOT STARTED]
Milestone 10 → Distributed Tracing         [NOT STARTED]
Milestone 11 → SRE Practices               [NOT STARTED]
Milestone 12 → Incident Simulation         [NOT STARTED]
Milestone 13 → Runbooks                    [NOT STARTED]
Milestone 14 → AI Incident Analyzer        [NOT STARTED]
Milestone 15 → AI Tool Calling             [NOT STARTED]
Milestone 16 → RAG                         [NOT STARTED]
Milestone 17 → Controlled Remediation      [NOT STARTED]
```

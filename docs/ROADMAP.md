# Project Roadmap

> **Last updated:** Milestone 4 — Kubernetes (complete)

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

> **Note:** Milestone 4 verified — plain Kubernetes manifests in `k8s/` on kind cluster `krp`, namespace `krp`. PostgreSQL Deployment + 1Gi PVC; application Deployments with ConfigMaps, `postgres-credentials` Secret (local placeholder `change_me`), liveness/readiness probes, and resource requests/limits. Manual in-cluster verification (no automated Kubernetes pytest suite). Helm packaging deferred to Milestone 5. Payment status updates remain owned by Payment Service; Order status is not automatically synchronized when a payment becomes `successful`.

---

## Milestone 5 — Helm

**Objective:** Package Kubernetes deployments as Helm charts.

**Major Tasks:**
- Create Helm chart structure
- Parameterize deployments with values files
- Support environment-specific configuration
- Document Helm deployment workflow

**Completion Criteria:**
- Services deploy via Helm install/upgrade
- Values files support configuration changes
- Helm charts are documented

**Status:** NOT STARTED

---

## Milestone 6 — CI/CD

**Objective:** Automate build, test, and deploy with GitHub Actions.

**Major Tasks:**
- Create CI pipeline (lint, test, build)
- Create CD pipeline (deploy to kind)
- Configure pipeline secrets management
- Document CI/CD workflow

**Completion Criteria:**
- CI runs on pull requests
- CD deploys on merge to main
- Pipeline secrets are managed securely

**Status:** NOT STARTED

---

## Milestone 7 — Metrics and Monitoring

**Objective:** Implement Prometheus metrics collection and Grafana dashboards.

**Major Tasks:**
- Instrument services with Prometheus metrics
- Deploy Prometheus to the cluster
- Deploy Grafana with dashboards
- Write PromQL queries for key metrics
- Document monitoring setup

**Completion Criteria:**
- Services expose `/metrics` endpoints
- Prometheus scrapes all services
- Grafana dashboards visualize service health

**Status:** NOT STARTED

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
Milestone 5  → Helm                        [NOT STARTED]
Milestone 6  → CI/CD                       [NOT STARTED]
Milestone 7  → Metrics and Monitoring      [NOT STARTED]
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

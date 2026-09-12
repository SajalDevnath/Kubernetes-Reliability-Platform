# Requirements

> **Status:** Milestone 12 complete — incident simulation scripts (`scripts/incidents/`), PostgreSQL monitoring (`postgres-exporter`, `KRPPostgresExporterDown`, `KRPPostgresDown`, **KRP PostgreSQL** dashboard), and ADR-025/ADR-026 deployed via `helm/krp/` (`krp-0.7.0`) and verified manually on kind cluster `krp` (PostgreSQL dependency failure E2E). Milestones 0–11 are implemented and verified. **180 tests** (142 unit, 36 integration, 2 E2E).

## Functional Requirements

### Microservices

| ID | Requirement | Status |
|----|-------------|--------|
| FR-001 | The system shall provide a User Service for user management | Implemented (User Service CRUD) |
| FR-002 | The system shall provide an Order Service for order management | Implemented (Order Service CRUD) |
| FR-003 | The system shall provide a Payment Service for payment processing | Implemented (Payment Service CRUD) |
| FR-004 | Order Service shall communicate with Payment Service for payment operations | Implemented (synchronous HTTP on order creation) |

### APIs

| ID | Requirement | Status |
|----|-------------|--------|
| FR-005 | Each microservice shall expose REST APIs via FastAPI | Implemented (User, Order, and Payment services) |
| FR-006 | APIs shall use Pydantic models for request/response validation | Implemented (User, Order, and Payment services) |
| FR-007 | APIs shall return appropriate HTTP status codes and error responses | Implemented (User, Order, and Payment services) |
| FR-008 | APIs shall include health check endpoints | Implemented (User Service and Payment Service `/health`) |

### Database

| ID | Requirement | Status |
|----|-------------|--------|
| FR-009 | The system shall use PostgreSQL as the database | Implemented (User, Order, and Payment services) |
| FR-010 | Database access shall use SQLAlchemy ORM | Implemented (engine, Base, sessions, User, Order, and Payment models) |
| FR-011 | Database configuration shall be externalized via environment variables | Implemented |

### Containerization

| ID | Requirement | Status |
|----|-------------|--------|
| FR-012 | Each microservice shall be packaged as a Docker image | Implemented (Dockerfiles for User, Order, and Payment services) |
| FR-013 | Services shall be orchestrated locally via Docker Compose | Implemented (`docker-compose.yml` with PostgreSQL and all services) |

### Kubernetes

| ID | Requirement | Status |
|----|-------------|--------|
| FR-014 | Services shall be deployable to a local Kubernetes cluster (kind) | Implemented (`k8s/` manifests, kind cluster `krp`) |
| FR-015 | Deployments shall include liveness and readiness probes | Implemented (postgres `pg_isready`; user/payment `/health`; order `GET /orders`) |
| FR-016 | Configuration shall use ConfigMaps and Secrets | Implemented (ConfigMaps + `postgres-credentials` Secret) |
| FR-017 | Services shall be packaged as Helm charts | Implemented (`helm/krp/`, chart `krp-0.7.0`) |

### CI/CD

| ID | Requirement | Status |
|----|-------------|--------|
| FR-018 | The project shall use GitHub Actions for CI/CD | Implemented (`.github/workflows/ci.yml`, `.github/workflows/cd.yml`) |
| FR-019 | Pipelines shall build, test, and deploy services | Implemented (CI: lint, test, build, Helm validation; CD: ephemeral kind deploy) |

### Monitoring

| ID | Requirement | Status |
|----|-------------|--------|
| FR-020 | Services shall expose Prometheus-compatible metrics | Implemented (`GET /metrics` on all three services; `prometheus-client`) |
| FR-021 | Grafana dashboards shall visualize service health and performance | Implemented (**KRP Service Health** `krp-services`, **KRP Service Logs** `krp-service-logs`, **KRP SRE** `krp-sre`, **KRP PostgreSQL** `krp-postgres`; locally verified on kind) |

### Logging

| ID | Requirement | Status |
|----|-------------|--------|
| FR-022 | Services shall emit structured logs | Implemented (JSON to stdout on all three services; required fields per ADR-022; 27 unit tests) |
| FR-023 | Logs shall be aggregated centrally via Loki | Implemented (Loki `grafana/loki:3.4.2` and Grafana Alloy `grafana/alloy:v1.9.2` via `helm/krp/`; locally verified on kind) |

### Tracing

| ID | Requirement | Status |
|----|-------------|--------|
| FR-024 | Services shall emit distributed traces via OpenTelemetry | Implemented (OpenTelemetry SDK in all three services; OTLP gRPC export to Collector; Tempo storage via `helm/krp/`) |
| FR-025 | Traces shall be correlated across service boundaries | Implemented (W3C Trace Context on Order → Payment `httpx` call; cross-service trace verified manually via `POST /orders` on kind) |

### Alerting

| ID | Requirement | Status |
|----|-------------|--------|
| FR-026 | Alertmanager shall route alerts based on defined rules | Implemented (Alertmanager deployed via `helm/krp/`; severity-based routing to `critical` and `warning` receivers; manually verified on kind) |
| FR-027 | Alerts shall be triggered for SLO violations and failure conditions | Implemented (M8 — `KRPServiceTargetDown` and `KRPHigh5xxErrorRate` manually verified; M11 — `KRPSLOAvailabilityViolation` and `KRPSLOErrorBudgetExhausted` manually verified for firing and resolution on kind; `KRPHighP95Latency` rule implemented and loaded, inactive under healthy traffic — deliberate firing path not demonstrated on kind per ADR-024 step 13; M12 — `KRPPostgresExporterDown` and `KRPPostgresDown` implemented; `KRPPostgresDown` manually verified for firing and resolution during PostgreSQL dependency failure simulation on kind) |

### SRE

| ID | Requirement | Status |
|----|-------------|--------|
| FR-028 | The platform shall define SLIs and SLOs for key services | Implemented (ADR-024; Prometheus recording rules for availability and P95 latency SLIs, 99%/500ms SLO targets, 6h window; manually verified on kind) |
| FR-029 | Error budgets shall be tracked and visualized | Implemented (error-budget recording rules and **KRP SRE** Grafana dashboard; manually verified on kind including fault injection and recovery) |
| FR-030 | Incident simulation scenarios shall be executable | Implemented (M12 — `scripts/incidents/`; three kubectl-based scenarios per ADR-025; PostgreSQL dependency failure manually verified on kind) |
| FR-031 | Runbooks shall document response procedures for common incidents | Planned |

### Incident Response

| ID | Requirement | Status |
|----|-------------|--------|
| FR-032 | The platform shall support structured incident investigation workflows | Planned |
| FR-033 | Root cause analysis shall be documented for simulated incidents | Planned |

### AI

| ID | Requirement | Status |
|----|-------------|--------|
| FR-034 | An AI Incident Analyzer shall assist with root cause analysis | Planned |
| FR-035 | AI shall use tool calling to query Kubernetes and observability data | Planned |
| FR-036 | AI shall use RAG to retrieve relevant runbooks and documentation | Planned |
| FR-037 | AI remediation actions shall require human approval | Planned |
| FR-038 | AI shall not have unrestricted destructive Kubernetes access | Planned |

## Non-Functional Requirements

### Performance

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-001 | Services shall respond to health checks within 1 second under normal conditions | Planned |
| NFR-002 | API endpoints shall respond within 500ms under normal local conditions | Planned |

### Reliability

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-003 | Services shall be independently deployable and restartable | Planned |
| NFR-004 | Service failures shall not cascade without observable symptoms | Planned |

### Security

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-005 | Secrets shall never be committed to version control | Planned |
| NFR-006 | Configuration shall be externalized via environment variables | Implemented |
| NFR-007 | Kubernetes Secrets shall be used for sensitive cluster configuration | Implemented (`postgres-credentials` Secret) |
| NFR-008 | AI operations shall follow least-privilege access principles | Planned |
| NFR-009 | Destructive AI actions shall require explicit human approval | Planned |

### Maintainability

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-010 | Code shall use type hints and follow Python conventions | Implemented |
| NFR-011 | Services shall follow a consistent layered architecture | Implemented (User, Order, and Payment services) |
| NFR-012 | Documentation shall be updated when implementation changes | Implemented |

### Testability

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-013 | Each service shall have unit, integration, and end-to-end tests | Implemented (142 unit + 36 integration + 2 E2E — 180 total; see `docs/TESTING.md` for current breakdown) |
| NFR-016 | The platform shall run locally without cloud dependencies | Implemented |
| NFR-014 | Failure scenarios shall be testable and reproducible | Implemented (M12 — reproducible kubectl-based incident simulation scripts per ADR-025; PostgreSQL dependency failure manually verified on kind) |
| NFR-015 | Observability outputs shall be verifiable | Implemented (M7 — `/metrics` unit tests; Prometheus scrape targets and Grafana dashboard verified locally and via GitHub Actions CD (commit `34f919b`); CD monitoring smoke checks verified; M8 — manual alert firing and resolution verified on kind via Prometheus `/api/v1/alerts` and Alertmanager `/api/v2/alerts`; M9 — structured logging unit tests; Loki, Alloy, Grafana Loki datasource/dashboard, and log/metric correlation verified manually on kind) |

### Portability

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-017 | Kubernetes shall use kind for local cluster provisioning | Implemented (kind cluster `krp`) |

# Kubernetes Reliability Platform

A hands-on learning project that builds Python/FastAPI microservices and progressively layers operational engineering capabilities — from local development through Docker, Kubernetes, observability, SRE practices, and AI-assisted incident response.

> **Milestones 0–12 complete.** User, Order, and Payment Service CRUD, Order → Payment HTTP integration (on order creation), E2E workflows, Docker Compose containerization, Kubernetes (kind) deployment, Helm chart packaging, GitHub Actions CI/CD, Metrics and Monitoring (Prometheus/Grafana, `/metrics` instrumentation), Alerting (Alertmanager, Prometheus alert rules), Centralized Logging (structured JSON logs, Loki, Grafana Alloy, Grafana log dashboard), Distributed Tracing (OpenTelemetry, Collector, Tempo, Grafana Explore), and SRE Practices (SLIs, SLOs, error budgets, **KRP SRE** dashboard) are implemented and verified. Milestone 12 delivers three incident simulation scenarios (`scripts/incidents/`) and PostgreSQL monitoring (`postgres-exporter`, **KRP PostgreSQL** dashboard); PostgreSQL dependency failure was manually verified end-to-end on kind — payment dependency and pod-crash scripts were not manually E2E verified in the M12 closeout.

## Quick Start

### Local development (uv)

```bash
python -m uv sync --dev
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir services/user_service
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8002 --app-dir services/order_service
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8003 --app-dir services/payment_service
python -m uv run pytest tests/unit -v
python -m uv run pytest tests/integration -v -m integration
python -m uv run pytest tests/e2e -v -m e2e
```

### Docker Compose

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8003/health
curl http://127.0.0.1:8002/orders
```

Stop the stack with `docker compose down` (omit `-v` to preserve the PostgreSQL volume).

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for full setup instructions.

### Kubernetes (kind)

Deploy to the local kind cluster using manifests in `k8s/`. See [k8s/README.md](k8s/README.md) for build, load, apply, and verification commands.

### Helm

Deploy to the local kind cluster using the Helm chart in `helm/krp/`. See [helm/krp/README.md](helm/krp/README.md) for install, upgrade, values, and M4 → M5 migration commands.

### CI/CD (GitHub Actions)

| Workflow | File | Trigger |
|----------|------|---------|
| **CI** | `.github/workflows/ci.yml` | `pull_request` |
| **CD** | `.github/workflows/cd.yml` | `push` to `main` |

**CI** runs Ruff lint, the full 180-test pytest suite (PostgreSQL 16 service container), Docker builds for all three services, and Helm lint/template validation.

**CD** builds images, creates an **ephemeral** kind cluster on the GitHub-hosted runner, loads `krp-*-service:ci` images, deploys `helm/krp/` into namespace `krp`, waits for all workloads (including Prometheus and Grafana), runs in-cluster HTTP and monitoring smoke tests, and deletes the cluster. CD does not deploy to a developer's local kind cluster and is not a production deployment.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the CI/CD workflow details.

## Purpose

The primary purpose is to learn and demonstrate:

- Python backend development with FastAPI
- REST APIs and PostgreSQL
- Docker and Docker Compose
- Kubernetes, Helm, and CI/CD
- Observability (Prometheus, Grafana, Alertmanager, Loki, OpenTelemetry)
- SRE practices and incident response
- AI-assisted root cause analysis and controlled remediation

The business logic is intentionally simple. The focus is on reliability engineering, not complex application development.

## Planned Technology Stack

| Layer | Technologies |
|-------|-------------|
| Application | Python, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, uv |
| Containers | Docker, Docker Compose (implemented) |
| Orchestration | Kubernetes, kind, kubectl (implemented); Helm (implemented) |
| CI/CD | GitHub Actions (implemented) |
| Metrics | Prometheus, PromQL (implemented — M7) |
| Visualization | Grafana (implemented — M7) |
| Alerting | Alertmanager (implemented — M8) |
| Logging | Loki, Grafana Alloy (implemented — M9) |
| Tracing | OpenTelemetry, OpenTelemetry Collector, Grafana Tempo (implemented — M10) |
| SRE | Prometheus SLI/SLO recording rules, error budgets, SRE alerting (implemented — M11) |
| Incident simulation | kubectl-based failure scenarios (`scripts/incidents/`) (implemented — M12) |
| PostgreSQL monitoring | postgres-exporter, PostgreSQL alerts, **KRP PostgreSQL** dashboard (implemented — M12) |
| AI | LLM API, tool calling, RAG, human-in-the-loop remediation |

## High-Level Architecture

```
Client → User Service

Client → Order Service → Payment Service

All services → PostgreSQL
```

Three microservices with simple business logic, designed to create realistic operational scenarios for learning observability, SRE, and incident response. Order Service calls Payment Service synchronously when an order is created; payment status updates remain owned by Payment Service and do not automatically change order status.

## Current Status

| Milestone | Name | Status |
|-----------|------|--------|
| 0 | Engineering Foundation | COMPLETE |
| 1 | Application Foundation | COMPLETE |
| 2 | Microservices | COMPLETE |
| 3 | Docker | COMPLETE |
| 4 | Kubernetes | COMPLETE |
| 5 | Helm | COMPLETE |
| 6 | CI/CD | COMPLETE |
| 7 | Metrics and Monitoring | COMPLETE |
| 8 | Alerting | COMPLETE |
| 9 | Logging | COMPLETE |
| 10 | Distributed Tracing | COMPLETE |
| 11 | SRE Practices | COMPLETE |
| 12 | Incident Simulation | COMPLETE |
| 13–17 | See roadmap | NOT STARTED |

**Tests:** 180 collected (142 unit, 36 integration, 2 E2E). CI runs the full suite on pull requests. See [docs/TESTING.md](docs/TESTING.md).

## Documentation

| Document | Description |
|----------|-------------|
| [Project Master Specification](PROJECT_MASTER_SPECIFICATION.md) | Single source of truth |
| [AGENTS.md](AGENTS.md) | AI assistant operating instructions |
| [Project Overview](docs/PROJECT.md) | Goals, scope, and capabilities |
| [Architecture](docs/ARCHITECTURE.md) | System architecture |
| [Requirements](docs/REQUIREMENTS.md) | Functional and non-functional requirements |
| [Development Guide](docs/DEVELOPMENT.md) | Development workflow |
| [Testing Strategy](docs/TESTING.md) | Testing approach |
| [Decisions](docs/DECISIONS.md) | Architecture decision records |
| [Roadmap](docs/ROADMAP.md) | Complete milestone roadmap |
| [Kubernetes Deployment](k8s/README.md) | kind cluster deployment guide (M4 reference manifests) |
| [Helm Chart](helm/krp/README.md) | Helm deployment guide (M5 parameterized packaging) |
| [Incident Simulation](scripts/incidents/README.md) | M12 scenario scripts and simulation procedures |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the complete 18-milestone progression from engineering foundation through AI-assisted controlled remediation.

## License

To be determined.

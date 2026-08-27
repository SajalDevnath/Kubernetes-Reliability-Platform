# Kubernetes Reliability Platform

A hands-on learning project that builds Python/FastAPI microservices and progressively layers operational engineering capabilities — from local development through Docker, Kubernetes, observability, SRE practices, and AI-assisted incident response.

> **Milestones 0–4 complete.** User, Order, and Payment Service CRUD, Order → Payment HTTP integration (on order creation), E2E workflows, Docker Compose containerization, and Kubernetes (kind) deployment are implemented and verified. **Milestone 5 — Helm** is next (not started).

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
| Orchestration | Kubernetes, kind, kubectl (implemented); Helm (planned) |
| CI/CD | GitHub Actions |
| Metrics | Prometheus, PromQL |
| Visualization | Grafana |
| Alerting | Alertmanager |
| Logging | Loki |
| Tracing | OpenTelemetry |
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
| 5 | Helm | NOT STARTED |
| 6–17 | See roadmap | NOT STARTED |

**Tests:** 124 passing (86 unit, 36 integration, 2 E2E). See [docs/TESTING.md](docs/TESTING.md).

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
| [Kubernetes Deployment](k8s/README.md) | kind cluster deployment guide |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the complete 18-milestone progression from engineering foundation through AI-assisted controlled remediation.

## License

To be determined.

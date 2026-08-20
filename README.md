# Kubernetes Reliability Platform

A hands-on learning project that builds Python/FastAPI microservices and progressively layers operational engineering capabilities — from local development through Docker, Kubernetes, observability, SRE practices, and AI-assisted incident response.

> **Milestone 2 in progress.** User Service CRUD is complete and verified against PostgreSQL. Order and Payment services are not yet built.

## Quick Start

```bash
python -m uv sync --dev
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir services/user_service
python -m uv run pytest tests/unit -v
python -m uv run pytest tests/integration -v -m integration
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for full setup instructions.

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
| Containers | Docker, Docker Compose |
| Orchestration | Kubernetes, kind, kubectl, Helm |
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

Three microservices with simple business logic, designed to create realistic operational scenarios for learning observability, SRE, and incident response.

## Current Status

| Milestone | Name | Status |
|-----------|------|--------|
| 0 | Engineering Foundation | COMPLETE |
| 1 | Application Foundation | COMPLETE |
| 2 | Microservices | IN PROGRESS |
| 3–17 | See roadmap | NOT STARTED |

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

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the complete 18-milestone progression from engineering foundation through AI-assisted controlled remediation.

## License

To be determined.

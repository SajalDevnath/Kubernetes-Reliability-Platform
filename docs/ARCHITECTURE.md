# Architecture

> **Status:** In progress — User Service skeleton implemented (health endpoint only).

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
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy (planned)
- **Database:** PostgreSQL (planned)
- **Location:** `services/user_service/`
- **Status:** Skeleton implemented — `GET /health` only; business APIs planned

### Order Service (Planned — Milestone 2)

- **Purpose:** Order management; communicates with Payment Service
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL
- **Dependencies:** Payment Service
- **Status:** Planned

### Payment Service

- **Purpose:** Payment processing for orders
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL
- **Status:** Planned

## Data Layer (Planned — Milestone 1, remaining tasks)

- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **Status:** Planned — not yet configured

## Containerization (Planned — Milestone 3)

- Each microservice packaged as a Docker image
- Local multi-service orchestration via Docker Compose
- **Status:** Planned

## Kubernetes (Planned — Milestone 4–5)

- Local Kubernetes cluster via kind
- Deployments, Services, ConfigMaps, Secrets
- Health probes and resource limits
- Helm charts for packaging
- **Status:** Planned

## CI/CD (Planned — Milestone 6)

- GitHub Actions for build, test, and deploy pipelines
- **Status:** Planned

## Observability (Planned — Milestones 7–10)

| Component | Purpose | Status |
|-----------|---------|--------|
| Prometheus | Metrics collection and PromQL queries | Planned |
| Grafana | Dashboards and visualization | Planned |
| Alertmanager | Alert routing and notification | Planned |
| Loki | Centralized log aggregation | Planned |
| OpenTelemetry | Distributed tracing | Planned |

## SRE Layer (Planned — Milestones 11–13)

- SLIs, SLOs, and error budgets
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
    │       └── health.py    # Health check endpoint
    ├── core/
    │   └── config.py        # Environment-based settings
    └── schemas/
        └── health.py        # Pydantic response models
```

## Design Principles

- Business logic remains intentionally simple
- Microservices exist to create realistic operational scenarios
- Each technology is introduced only when its milestone begins
- Local-first — no AWS dependency for core implementation

# Architecture

> **Status:** Milestone 3 complete — User, Order, and Payment Service CRUD, Order → Payment integration, E2E workflows, and Docker Compose containerization verified.

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
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL
- **Location:** `services/user_service/`
- **Status:** Complete — `GET /health` and `/users` CRUD endpoints verified against PostgreSQL

### Order Service

- **Purpose:** Order management (CRUD) with synchronous Payment Service integration on order creation
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL
- **Location:** `services/order_service/`
- **Dependencies:** Payment Service (synchronous HTTP on order creation via `PAYMENT_SERVICE_URL`)
- **Status:** Complete — `/orders` CRUD endpoints and Order → Payment integration verified against PostgreSQL and Docker Compose

### Payment Service

- **Purpose:** Payment processing for orders (CRUD)
- **Technology:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL
- **Location:** `services/payment_service/`
- **Port:** 8003
- **Dependencies:** Order Service (reference via `order_id` only — no cross-service FK or reverse HTTP integration)
- **Status:** Complete — `GET /health` and `/payments` CRUD endpoints verified against PostgreSQL and Docker Compose

## Data Layer

- **Database:** PostgreSQL
- **ORM:** SQLAlchemy 2.x (synchronous)
- **Location:** `services/user_service/app/db/`
- **Status:** Implemented — engine, session factory, declarative Base, `get_db` dependency, connectivity check, and `User` ORM model

## Containerization (Milestone 3 — implemented)

- Each microservice packaged as a Docker image (`services/*/Dockerfile`)
- Local multi-service orchestration via `docker-compose.yml`
- PostgreSQL 16 in Compose with named volume persistence
- Compose network (`krp-network`) for service-name DNS (`postgres`, `user-service`, `order-service`, `payment-service`)
- Container healthchecks: PostgreSQL `pg_isready`; User/Payment `/health`; Order `GET /orders`
- Order Service uses `PAYMENT_SERVICE_URL=http://payment-service:8003` inside Compose
- **Status:** Complete — verified via `docker compose build`, `docker compose up`, and host/Compose-network checks

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
    │       ├── health.py    # Health check endpoint
    │       └── users.py     # User CRUD endpoints
    ├── core/
    │   ├── config.py        # Environment-based settings (incl. PostgreSQL)
    │   └── exceptions.py    # Application exceptions
    ├── db/
    │   └── database.py      # SQLAlchemy engine, Base, sessions, connectivity check
    ├── models/
    │   └── user.py          # User ORM model
    ├── repositories/
    │   └── user.py          # User data access
    ├── services/
    │   └── user.py          # User business logic
    └── schemas/
        ├── health.py        # Health response model
        └── user.py          # User request/response schemas
```

## Order Service Package Structure

```
services/order_service/
└── app/
    ├── main.py              # FastAPI application entry point
    ├── api/
    │   ├── router.py        # Aggregates API routers
    │   └── routes/
    │       └── orders.py    # Order CRUD endpoints
    ├── core/
    │   ├── config.py        # Environment-based settings (port 8002)
    │   └── exceptions.py    # OrderNotFoundError, InvalidOrderStateError
    ├── db/
    │   └── database.py      # SQLAlchemy engine, Base, sessions
    ├── models/
    │   └── order.py         # Order ORM model and OrderStatus enum
    ├── repositories/
    │   └── order.py         # Order data access
    ├── services/
    │   └── order.py         # Order business logic
    └── schemas/
        └── order.py         # Order request/response schemas
```

### Order Model

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | Primary key |
| `user_id` | integer | Reference to User Service (no cross-service FK) |
| `status` | enum | `pending`, `paid`, `cancelled` (default: `pending`) |
| `total_amount` | decimal(10,2) | Must be positive |
| `created_at` | datetime | Set on creation |
| `updated_at` | datetime | Updated on modification |

## Payment Service Package Structure

```
services/payment_service/
└── app/
    ├── main.py              # FastAPI application entry point
    ├── api/
    │   ├── router.py        # Aggregates API routers
    │   └── routes/
    │       ├── health.py    # Health check endpoint
    │       └── payments.py  # Payment CRUD endpoints
    ├── core/
    │   ├── config.py        # Environment-based settings (port 8003)
    │   └── exceptions.py    # PaymentNotFoundError, InvalidPaymentStateError
    ├── db/
    │   └── database.py      # SQLAlchemy engine, Base, sessions
    ├── models/
    │   └── payment.py       # Payment ORM model and PaymentStatus enum
    ├── repositories/
    │   └── payment.py       # Payment data access
    ├── services/
    │   └── payment.py       # Payment business logic
    └── schemas/
        ├── health.py        # Health response model
        └── payment.py       # Payment request/response schemas
```

### Payment Model

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | Primary key |
| `order_id` | integer | Reference to Order Service (no cross-service FK) |
| `amount` | decimal(10,2) | Must be positive |
| `status` | enum | `pending`, `successful`, `failed` (default: `pending`) |
| `created_at` | datetime | Set on creation |
| `updated_at` | datetime | Updated on modification |

### Payment Status Transitions

| From | Allowed transitions |
|------|---------------------|
| `pending` | `successful`, `failed` |
| `successful` | Terminal — no updates allowed |
| `failed` | Terminal — no updates allowed |

Amount updates are allowed only while status is `pending`.

## Design Principles

- Business logic remains intentionally simple
- Microservices exist to create realistic operational scenarios
- Each technology is introduced only when its milestone begins
- Local-first — no AWS dependency for core implementation

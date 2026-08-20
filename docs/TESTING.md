# Testing Strategy

> **Status:** Milestone 2 in progress — User Service CRUD complete and verified (35 tests passing).

## Philosophy

A task is not complete merely because the application starts. Every change must be tested and verified before it is considered done.

## Test Levels

### Unit Tests (Milestone 2 — User Service complete)

- **Scope:** Individual functions, classes, API endpoint behavior, schemas, repository, and service logic
- **Location:** `tests/unit/`
- **Tools:** pytest, FastAPI TestClient, httpx, SQLite (repository tests)
- **Status:** Complete for User Service — 25 tests passing

### Integration Tests (Milestone 2 — User Service complete)

- **Scope:** Live PostgreSQL connectivity and User CRUD API flows
- **Location:** `tests/integration/`
- **Tools:** pytest, SQLAlchemy, FastAPI TestClient
- **Status:** Complete for User Service — 10 tests passing against PostgreSQL

### End-to-End Tests (Planned — Milestone 2+)

- **Scope:** Full request flows across multiple services
- **Location:** `tests/e2e/`
- **Example:** Create user → create order → process payment
- **Status:** Planned

### Container Tests (Planned — Milestone 3)

- **Scope:** Docker image builds, container startup, health checks
- **Status:** Planned

### Kubernetes Tests (Planned — Milestone 4)

- **Scope:** Deployment health, probe behavior, service discovery, scaling
- **Status:** Planned

### Failure Simulation Tests (Planned — Milestone 12)

- **Scope:** Network failures, latency injection, dependency failures
- **Purpose:** Verify observability captures failure symptoms
- **Status:** Planned

### Observability Verification (Planned — Milestones 7–10)

- **Scope:** Metrics appear in Prometheus, logs in Loki, traces in OpenTelemetry
- **Purpose:** Confirm instrumentation is correct
- **Status:** Planned

### AI Testing (Planned — Milestones 14–17)

- **Scope:** Prompt quality, tool calling accuracy, RAG retrieval, safety guardrails
- **Purpose:** Ensure AI recommendations are safe and useful
- **Status:** Planned

## Test Execution

| When | What to Run |
|------|-------------|
| Every code change | Relevant unit tests |
| Service integration | Integration tests |
| Before commit | Full test suite for changed area |
| Milestone completion | All tests for that milestone |

## Currently Available Tests

| Test File | Coverage |
|-----------|----------|
| `tests/unit/test_health.py` | `GET /health` status code, response body, schema shape |
| `tests/unit/test_database_config.py` | PostgreSQL URL construction and settings defaults |
| `tests/unit/test_database.py` | SQLAlchemy engine, session factory, `get_db`, declarative Base |
| `tests/unit/test_user_schemas.py` | User Pydantic schema validation |
| `tests/unit/test_user_repository.py` | User repository CRUD (SQLite) |
| `tests/unit/test_user_service.py` | User service business logic and error handling |
| `tests/integration/test_database_connectivity.py` | Live PostgreSQL connectivity (`SELECT 1`) |
| `tests/integration/test_users_api.py` | User CRUD API against PostgreSQL |

Run with:

```bash
python -m uv run pytest tests/unit -v
python -m uv run pytest tests/integration -v -m integration
```

## Test Directory Structure

```
tests/
├── unit/           # Unit tests (User Service complete — 25 passing)
├── integration/    # PostgreSQL + User CRUD API tests (User Service complete — 10 passing)
└── e2e/            # End-to-end cross-service tests (planned — Milestone 2 remaining)
```

## Quality Gates

Before a milestone is marked complete:

1. All tests for that milestone pass
2. No regressions in previously passing tests
3. Test results are reported before commit authorization
4. New functionality has corresponding test coverage

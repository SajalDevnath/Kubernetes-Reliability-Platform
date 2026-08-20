# Development Guide

> **Current Milestone:** Milestone 2 — Microservices (in progress)

This document describes the development workflow for the Kubernetes Reliability Platform.

## Development Philosophy

- Work incrementally, one milestone at a time
- Keep implementations simple — the goal is learning, not complexity
- Test and verify every change before considering it complete
- Update documentation when implementation changes require it
- Do not introduce technologies before their milestone

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (`python -m uv` if installed via pip)
- Git
- PostgreSQL (required for integration connectivity tests; optional for unit tests)

## Python Development Workflow

1. Use `uv` for dependency and environment management
2. Application code lives under `services/<service_name>/`
3. Use type hints and follow coding standards in `.cursor/rules/coding-style.mdc`
4. Structure code with clear separation: routers, schemas, core/config (services/repositories added when needed)

## Local Setup

```bash
# Install dependencies (creates .venv automatically)
python -m uv sync --dev

# Copy environment template and adjust if needed
cp .env.example .env
```

## Running the User Service

```bash
# Start the FastAPI application
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir services/user_service

# Verify health endpoint
curl http://127.0.0.1:8001/health
```

Expected response:

```json
{"status":"ok","service":"user-service","environment":"development"}
```

API documentation is available at `http://127.0.0.1:8001/docs` when the service is running.

### User CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/users` | Create a user |
| `GET` | `/users` | List users (supports `skip` and `limit`) |
| `GET` | `/users/{user_id}` | Get a user by ID |
| `PATCH` | `/users/{user_id}` | Update a user |
| `DELETE` | `/users/{user_id}` | Delete a user |

Example:

```bash
curl -X POST http://127.0.0.1:8001/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","full_name":"Test User"}'
```

## FastAPI Development Workflow

1. Define Pydantic schemas for request/response models
2. Implement business logic in service layer (when introduced)
3. Wire endpoints in FastAPI routers
4. Use dependency injection for configuration and database sessions via `get_db`
5. Test endpoints with pytest and FastAPI TestClient

## Running Tests

```bash
# Run all unit tests
python -m uv run pytest tests/unit -v

# Run PostgreSQL connectivity integration test (requires running PostgreSQL)
python -m uv run pytest tests/integration -v -m integration
```

The integration test uses `POSTGRES_*` variables from `.env` (or defaults in `.env.example`). PostgreSQL must be running for integration tests to execute.

## Database Configuration

PostgreSQL settings are loaded from environment variables:

| Variable | Default |
|----------|---------|
| `POSTGRES_HOST` | `localhost` |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_DB` | `k8s_reliability` |
| `POSTGRES_USER` | `app_user` |
| `POSTGRES_PASSWORD` | `change_me` |

Alternatively, set `DATABASE_URL` to override the component-based connection string.

Connectivity can be verified programmatically via `app.db.database.check_database_connection()`.

## Local Development Philosophy

- The entire platform runs locally
- No AWS or cloud dependencies for core implementation
- Use kind for local Kubernetes clusters (Milestone 4+)
- Use Docker Compose for local multi-service development (Milestone 3+)

## Cursor Workflow

When working with Cursor AI:

1. Identify the current milestone and task from `docs/ROADMAP.md`
2. Read relevant documentation before making changes
3. Follow `PROJECT_MASTER_SPECIFICATION.md` and `AGENTS.md`
4. Implement only the requested task — do not jump ahead
5. Test and verify changes
6. Review Git changes before requesting commit authorization

See `AGENTS.md` for the complete AI assistant operating model.

## Git Workflow

1. Work on focused branches per milestone or task
2. Keep commits small and focused
3. Use conventional commit messages (see `.cursor/rules/git.mdc`)
4. Never commit secrets or generated artifacts
5. Request authorization before committing

## Testing Workflow

1. Write tests alongside implementation
2. Run unit tests for every code change
3. Run integration tests when services interact (Milestone 2+)
4. Run end-to-end tests for full request flows (Milestone 2+)
5. Report test results before requesting commit authorization

See `docs/TESTING.md` for the full testing strategy.

## Documentation Workflow

1. Update relevant docs when implementation changes architecture or behavior
2. Mark unimplemented features as "Planned"
3. Record architectural decisions in `docs/DECISIONS.md`
4. Keep the roadmap status current in `docs/ROADMAP.md`

## Milestone Workflow

For each milestone:

1. Read the milestone objective and tasks in `docs/ROADMAP.md`
2. Create an implementation plan in `.cursor/plans/` if needed
3. Implement tasks incrementally
4. Test and verify each task
5. Update documentation
6. Mark milestone tasks complete in the roadmap
7. Request commit authorization with changed files and test results

## Future Prerequisites (by milestone)

| Milestone | Tools Required |
|-----------|---------------|
| 2 | PostgreSQL (for service + database integration) |
| 3 | Docker, Docker Compose |
| 4 | kind, kubectl |
| 5 | Helm |
| 6 | GitHub Actions (cloud) |
| 7–10 | Prometheus, Grafana, Alertmanager, Loki, OpenTelemetry |
| 14–17 | LLM API access |

Do not install future prerequisites until their milestone begins.

# Development Guide

> **Current Milestone:** Milestone 1 — Application Foundation (next)

This document describes the intended development workflow for the Kubernetes Reliability Platform.

## Development Philosophy

- Work incrementally, one milestone at a time
- Keep implementations simple — the goal is learning, not complexity
- Test and verify every change before considering it complete
- Update documentation when implementation changes require it
- Do not introduce technologies before their milestone

## Python Development Workflow (Planned — Milestone 1+)

Once application development begins:

1. Use `uv` for dependency and environment management
2. Create virtual environments per service or monorepo as designed
3. Use type hints and follow coding standards in `.cursor/rules/coding-style.mdc`
4. Structure code with clear separation: routers, services, repositories, models, schemas

## FastAPI Development Workflow (Planned — Milestone 1+)

1. Define Pydantic schemas for request/response models
2. Implement business logic in service layer
3. Wire endpoints in FastAPI routers
4. Use dependency injection for database sessions and configuration
5. Test endpoints with pytest and httpx

## Local Development Philosophy

- The entire platform runs locally
- No AWS or cloud dependencies for core implementation
- Use kind for local Kubernetes clusters
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
3. Run integration tests when services interact
4. Run end-to-end tests for full request flows
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

## Prerequisites (Current — Milestone 0)

- Git
- A text editor or IDE (Cursor recommended)
- GitHub account (for version control)

## Future Prerequisites (by milestone)

| Milestone | Tools Required |
|-----------|---------------|
| 1 | Python 3.x, uv |
| 3 | Docker, Docker Compose |
| 4 | kind, kubectl |
| 5 | Helm |
| 6 | GitHub Actions (cloud) |
| 7–10 | Prometheus, Grafana, Alertmanager, Loki, OpenTelemetry |
| 14–17 | LLM API access |

Do not install future prerequisites until their milestone begins.

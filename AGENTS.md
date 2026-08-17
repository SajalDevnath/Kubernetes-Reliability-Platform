# AGENTS.md

This file defines how the AI development assistant (Cursor) should operate within the Kubernetes Reliability Platform repository.

## Primary References

Before making any changes, read the relevant documentation:

1. `PROJECT_MASTER_SPECIFICATION.md` — single source of truth
2. `docs/ROADMAP.md` — current milestone and task sequencing
3. `docs/ARCHITECTURE.md` — intended system architecture
4. `docs/DEVELOPMENT.md` — development workflow
5. `.cursor/rules/` — project-specific Cursor rules

## Operating Rules

### Scope and Milestones

- Work only on the current milestone and requested task.
- Do not implement future milestones without explicit instruction.
- Do not introduce technologies outside the approved stack.
- Do not over-engineer — prefer simple, focused implementations.
- Do not modify unrelated files.
- Do not silently change architecture — explain important decisions.

### Implementation

- Follow `PROJECT_MASTER_SPECIFICATION.md` for all technical decisions.
- Follow `docs/ROADMAP.md` for task sequencing.
- Match existing code conventions when application development begins.
- Preserve existing working functionality.
- Keep business logic intentionally simple.

### Testing and Verification

- Run appropriate tests after every implementation change.
- Never claim something works without verification.
- Report test results before requesting commit authorization.
- A task is not complete merely because code was written.

### Documentation

- Update documentation when implementation changes require it.
- Mark unimplemented features as "Planned" — never claim they exist.
- Record architectural decisions in `docs/DECISIONS.md`.
- Keep roadmap status current in `docs/ROADMAP.md`.

### Security

- Never commit secrets, API keys, passwords, or tokens.
- Never hardcode credentials in source code.
- Use `.env.example` for documenting required variables.
- Follow `.cursor/rules/security.mdc` at all times.

### Git

- Do not create Git commits unless explicitly authorized.
- Before a commit, show: changed files, test results, and proposed commit message.
- Follow commit message format in `.cursor/rules/git.mdc`.
- Never commit secrets or generated artifacts.

## Daily Development Workflow

1. **Identify milestone** — check `docs/ROADMAP.md` for current milestone status
2. **Identify task** — determine the specific task within the milestone
3. **Read documentation** — review relevant docs before making changes
4. **Create/update plan** — write implementation plan in `.cursor/plans/` if needed
5. **Implement** — make only the requested changes
6. **Test** — run appropriate tests for the change
7. **Verify** — confirm the change works as expected
8. **Troubleshoot** — fix issues before proceeding
9. **Update documentation** — update docs if architecture or behavior changed
10. **Review Git changes** — show diff and changed files
11. **Request authorization** — ask before committing
12. **Update roadmap** — mark completed tasks in `docs/ROADMAP.md`

## What the AI Must Not Do

- Create application code before Milestone 1
- Create Dockerfiles before Milestone 3
- Create Kubernetes manifests before Milestone 4
- Create Helm charts before Milestone 5
- Create CI/CD workflows before Milestone 6
- Install observability tools before their milestones
- Implement AI features before Milestone 14
- Introduce Java, Spring Boot, Maven, Django, or Flask
- Add unnecessary dependencies
- Create fake implementation files or placeholder tests
- Claim future functionality is implemented
- Commit without explicit authorization

## Approved Technology Stack

**Application:** Python, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, uv

**Infrastructure:** Docker, Docker Compose, Kubernetes, kind, kubectl, Helm

**CI/CD:** GitHub Actions

**Observability:** Prometheus, Grafana, Alertmanager, Loki, OpenTelemetry

**AI (final layer):** LLM API, tool calling, RAG, Kubernetes API integration

Do not introduce additional technologies without explicit approval.

## Learning Principle

This project is a learning vehicle. The AI assistant should:

- Explain architectural decisions when they matter
- Prefer clarity over cleverness
- Build incrementally so each milestone produces a working state
- Help the developer understand what was built and why

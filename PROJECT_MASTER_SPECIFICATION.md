# Project Master Specification

**Kubernetes Reliability Platform**

> Single source of truth for the project's scope, architecture, workflow, and progression.

---

## 1. Project Overview

The Kubernetes Reliability Platform is a hands-on learning and demonstration project that builds three small Python/FastAPI microservices and progressively layers operational engineering capabilities — from local development through Docker, Kubernetes, observability, SRE practices, incident simulation, and AI-assisted operations.

The business logic is intentionally simple. The primary purpose is learning and demonstrating reliability engineering, not building a complex business application.

## 2. Project Objectives

- Learn and demonstrate Python backend development with FastAPI
- Build three microservices with realistic service-to-service communication
- Progress through containerization, orchestration, and packaging
- Implement full observability: metrics, logging, tracing, and alerting
- Practice SRE concepts: SLIs, SLOs, error budgets, incident response
- Simulate failures and practice root cause analysis
- Introduce AI-assisted operations as the final layer

## 3. Scope

### In Scope

- User, Order, and Payment microservices
- PostgreSQL database
- Local development and local Kubernetes (kind)
- Docker and Docker Compose
- Helm charts
- GitHub Actions CI/CD
- Prometheus, Grafana, Alertmanager, Loki, OpenTelemetry
- SRE practices, incident simulation, runbooks
- AI-assisted RCA, tool calling, RAG, controlled remediation

### Out of Scope

- Complex business logic
- AWS or cloud-specific infrastructure for core implementation
- Production multi-region deployment
- Java, Spring Boot, Maven, Django, Flask
- Premature technology introduction

## 4. Application Architecture

```
Client → User Service

Client → Order Service → Payment Service

All services → PostgreSQL
```

Three independent microservices communicating via REST APIs. Order Service depends on Payment Service. All services use PostgreSQL.

## 5. Microservices

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| User Service | User management (CRUD) | PostgreSQL |
| Order Service | Order management | PostgreSQL, Payment Service |
| Payment Service | Payment processing | PostgreSQL |

Business logic remains intentionally small. Services exist to create realistic operational scenarios.

## 6. Technology Stack

### Application

| Technology | Purpose |
|-----------|---------|
| Python 3.x | Programming language |
| FastAPI | Web framework |
| Pydantic | Data validation |
| SQLAlchemy | ORM |
| PostgreSQL | Database |
| uv | Dependency management |

### Version Control

- Git
- GitHub

### Containers

- Docker
- Docker Compose

### Kubernetes

- Kubernetes
- kind (local clusters)
- kubectl
- Helm

### CI/CD

- GitHub Actions

### Observability

| Technology | Purpose |
|-----------|---------|
| Prometheus | Metrics collection |
| PromQL | Metrics query language |
| Grafana | Visualization |
| Alertmanager | Alert routing |
| Loki | Log aggregation |
| OpenTelemetry | Distributed tracing |

### AI (Final Layer)

- LLM API
- Structured prompting
- Tool calling
- RAG
- Kubernetes API integration
- Human-in-the-loop remediation

## 7. Final Architecture

The complete platform architecture, when all milestones are finished:

```
┌─────────────────────────────────────────────────────────┐
│                    Client / Operator                     │
└──────────┬──────────────────────────────┬───────────────┘
           │                              │
           v                              v
┌──────────────────┐          ┌──────────────────────┐
│  Microservices   │          │   AI SRE Assistant   │
│  ┌────────────┐  │          │  (RCA, Tools, RAG)   │
│  │User Service│  │          └──────────┬───────────┘
│  ├────────────┤  │                     │
│  │Order Svc   │──┼──► Payment Service  │
│  ├────────────┤  │                     │
│  │Payment Svc │  │                     │
│  └─────┬──────┘  │                     │
│        │         │                     │
│        v         │                     │
│   PostgreSQL     │                     │
└────────┬─────────┘                     │
         │                               │
         v                               v
┌─────────────────────────────────────────────────────────┐
│              Observability Stack                         │
│  Prometheus │ Grafana │ Alertmanager │ Loki │ OTel      │
└─────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────┐
│              Kubernetes (kind) + Helm                    │
│              CI/CD (GitHub Actions)                      │
└─────────────────────────────────────────────────────────┘
```

## 8. Repository Structure

```
kubernetes-reliability-platform/
│
├── .cursor/
│   ├── rules/          # Cursor AI rules
│   └── plans/          # Implementation plans per milestone
│
├── docs/               # Project documentation
├── scripts/            # Utility scripts (added per milestone)
├── tests/
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
│
├── .env.example        # Environment variable template
├── .gitignore
├── AGENTS.md           # AI assistant operating instructions
├── PROJECT_MASTER_SPECIFICATION.md
└── README.md
```

Application and infrastructure directories (services, Docker, k8s, helm, etc.) will be introduced progressively during their respective milestones.

## 9. Documentation Architecture

| Document | Purpose |
|----------|---------|
| `PROJECT_MASTER_SPECIFICATION.md` | Master blueprint (this file) |
| `AGENTS.md` | AI assistant operating model |
| `docs/PROJECT.md` | Project overview and goals |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/REQUIREMENTS.md` | Functional and non-functional requirements |
| `docs/DEVELOPMENT.md` | Development workflow |
| `docs/TESTING.md` | Testing strategy |
| `docs/DECISIONS.md` | Architecture decision records |
| `docs/ROADMAP.md` | Complete milestone roadmap |
| `README.md` | Project entry point |

## 10. Cursor AI Operating Model

The AI development assistant operates according to `AGENTS.md` and `.cursor/rules/`:

- Read documentation before making changes
- Work only on the current milestone/task
- Implement incrementally
- Test and verify every change
- Update documentation when needed
- Request authorization before committing

## 11. Cursor Development Rules

Rules are defined in `.cursor/rules/`:

| Rule File | Scope |
|-----------|-------|
| `project.mdc` | General project rules |
| `architecture.mdc` | Intended architecture |
| `coding-style.mdc` | Python/FastAPI standards |
| `testing.mdc` | Testing expectations |
| `security.mdc` | Security rules |
| `git.mdc` | Git workflow and commits |

## 12. Daily Development Workflow

1. Identify current milestone from roadmap
2. Identify specific task
3. Read relevant documentation
4. Create or update implementation plan
5. Implement only the requested task
6. Test
7. Verify
8. Troubleshoot if needed
9. Update documentation
10. Review Git changes
11. Request commit authorization
12. Update roadmap status

## 13. Git Strategy

- Conventional commit messages: `<type>: <description>`
- Small, focused commits
- No secrets in version control
- No commits without explicit authorization
- Branch per milestone or task

## 14. Milestone Strategy

The project progresses through 18 milestones (0–17):

```
Git → Python → FastAPI → REST APIs → PostgreSQL → Docker → Docker Compose
→ Kubernetes → Deployments → Services → ConfigMaps/Secrets → Probes
→ Resource Limits → Helm → GitHub Actions → Prometheus → PromQL → Grafana
→ Alertmanager → Loki → OpenTelemetry → Incident Management → Runbooks
→ AI Incident Analyzer → AI Tool Calling → RAG → Human Approval
→ Controlled Auto-Remediation
```

Each milestone produces a working, verifiable state. No milestone is skipped.

AI milestones (14–17) are the final layer. The platform must work fully without AI first.

## 15. Testing Philosophy

- Unit, integration, and end-to-end tests
- Container and Kubernetes behavior tests
- Failure simulation tests
- Observability verification
- AI testing (later milestones)
- A task is not complete without test verification

## 16. Security Principles

- Never commit secrets
- Never hardcode credentials
- Externalize configuration via environment variables
- Use Kubernetes Secrets for cluster configuration
- AI must not have unrestricted Kubernetes access
- Destructive operations require human approval
- AI must not initially delete namespaces, databases, secrets, or PVs

## 17. Documentation Maintenance

- Update docs when implementation changes architecture or behavior
- Mark unimplemented features as "Planned"
- Record decisions in `docs/DECISIONS.md`
- Keep roadmap status current

## 18. What Cursor Must Not Do

- Implement application code before Milestone 1
- Create infrastructure before its milestone
- Introduce unapproved technologies
- Over-engineer or add unnecessary abstractions
- Create fake files or placeholder tests
- Claim future functionality is implemented
- Commit without authorization
- Introduce Java, Spring Boot, Maven, Django, or Flask

## 19. Learning Principle

This is a learning project. Each milestone builds practical skills:

- Application development (Milestones 1–2)
- Containerization (Milestone 3)
- Orchestration (Milestones 4–5)
- Automation (Milestone 6)
- Observability (Milestones 7–10)
- Reliability engineering (Milestones 11–13)
- AI-assisted operations (Milestones 14–17)

Complexity is introduced gradually. Each layer must work before the next is added.

## 20. Final Project Outcome

A fully operational Kubernetes-based reliability platform demonstrating:

1. Three running microservices with REST APIs
2. Containerized and Kubernetes-deployed services
3. Automated CI/CD pipelines
4. Full observability stack (metrics, logs, traces, alerts)
5. SRE practices with SLIs, SLOs, and error budgets
6. Incident simulation and runbook-driven response
7. AI-assisted root cause analysis with human-in-the-loop remediation

## 21. Target Roles

This project is designed for:

- Backend developers learning DevOps/SRE
- DevOps engineers learning application development
- SRE practitioners learning observability and AI-assisted operations
- Students learning cloud-native architecture
- Anyone building practical Kubernetes and reliability skills

## 22. Definition of Done

A milestone task is done when:

1. Implementation matches the specification
2. Tests pass (when applicable)
3. Changes are verified manually
4. Documentation is updated if needed
5. No secrets are committed
6. Git changes are reviewed
7. Commit authorization is obtained (if committing)

A milestone is done when all its tasks meet the above criteria and completion criteria in the roadmap.

## 23. Initial Project State

**Current Milestone:** Milestone 2 — Microservices (IN PROGRESS)

**Status:**
- Milestone 1 complete (User Service foundation, health endpoint, PostgreSQL/SQLAlchemy)
- User Service CRUD APIs complete and verified (`/users` — 25 unit tests, 10 integration tests passing)
- Order Service CRUD APIs and Order → Payment HTTP integration complete and verified
- Payment Service CRUD APIs complete and verified (`/payments` — 29 unit tests, 12 integration tests passing)
- No Docker, Kubernetes, or infrastructure files exist

**Next Milestone 2 Task:** E2E cross-service workflows (user → order → payment)

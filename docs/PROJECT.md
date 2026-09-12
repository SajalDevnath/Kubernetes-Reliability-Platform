# Kubernetes Reliability Platform

> **Current progress:** Milestones 0–12 complete. Incident simulation scripts (`scripts/incidents/`), PostgreSQL monitoring (`postgres-exporter`, **KRP PostgreSQL** dashboard, `KRPPostgresExporterDown`/`KRPPostgresDown` alerts), and PostgreSQL dependency failure E2E verification on kind cluster `krp`. SRE SLIs, SLOs, error budgets, and **KRP SRE** dashboard verified. Distributed tracing, centralized logging, Alertmanager, and application metrics verified. Milestone 13 — Runbooks is next.

## What This Project Is

The Kubernetes Reliability Platform is a hands-on learning and demonstration project that builds a small set of Python/FastAPI microservices and progressively layers operational engineering capabilities on top — from local development through Docker, Kubernetes, observability, SRE practices, and AI-assisted incident response.

## Why It Exists

Modern platform and SRE engineering requires practical experience across application development, containerization, orchestration, observability, incident management, and reliability practices. This project provides a structured, incremental path to learn and demonstrate those skills using a deliberately simple business domain.

## Goals

- Learn and demonstrate Python backend development with FastAPI
- Build and operate three microservices with realistic service-to-service communication
- Progress through Docker, Kubernetes, Helm, and CI/CD
- Implement full observability: metrics, logging, tracing, and alerting
- Practice SRE concepts: SLIs, SLOs, error budgets, incident response, and runbooks
- Simulate failures and practice root cause analysis
- Introduce AI-assisted operations as the final layer: RCA, tool calling, RAG, and controlled remediation

## Scope

**In scope:**

- Three microservices: User, Order, Payment (implemented)
- PostgreSQL database (implemented)
- Docker and Docker Compose local orchestration (implemented)
- Local Kubernetes (kind) (implemented — Milestone 4)
- Helm chart packaging (implemented — Milestone 5)
- GitHub Actions CI/CD (implemented — Milestone 6)
- Application metrics and Prometheus/Grafana monitoring (implemented and verified — Milestone 7)
- Alertmanager alerting with Prometheus rules and severity-based routing (implemented and verified — Milestone 8)
- Centralized logging with structured JSON logs, Loki, Grafana Alloy, and Grafana log dashboard (implemented and verified — Milestone 9)
- Distributed tracing with OpenTelemetry, OpenTelemetry Collector, and Grafana Tempo (implemented and verified — Milestone 10)
- SRE practices: SLIs, SLOs, error budgets, and SRE alerting (implemented and verified — Milestone 11)
- Incident simulation (implemented — Milestone 12; three kubectl-based scenarios; PostgreSQL dependency failure manually verified end-to-end on kind; payment dependency and pod-crash scripts not manually E2E verified in M12 closeout; simulation procedures, not operational runbooks)
- Operational runbooks (Milestone 13)
- AI-assisted operations (final phase)

**Out of scope:**

- Complex business logic or domain modeling
- AWS or cloud-specific infrastructure for the core implementation
- Production-grade multi-region deployment
- Java, Spring Boot, or Maven-based services
- Premature introduction of technologies before their milestone

## Final Expected Capabilities

When complete, the platform will demonstrate:

1. Running microservices locally and in Kubernetes
2. Automated CI/CD pipelines (GitHub Actions — CI on pull requests; CD to ephemeral kind on `main`)
3. Prometheus metrics collection, Grafana dashboards, and Alertmanager alerting (Milestones 7–8 — implemented)
4. Centralized logging with Loki and Grafana Alloy (Milestone 9 — implemented)
5. Distributed tracing with OpenTelemetry (Milestone 10 — implemented)
6. SRE practices including SLIs, SLOs, and error budgets (Milestone 11 — implemented)
7. Incident simulation for failure practice (Milestone 12 — implemented)
8. Runbook-driven incident response (Milestone 13 — planned)
9. AI-assisted root cause analysis with human-in-the-loop remediation

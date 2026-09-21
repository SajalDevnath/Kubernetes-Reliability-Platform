# Kubernetes Reliability Platform

> **Current progress:** Milestones 0–14 complete. Live Observability Console (`frontend/`, `services/observability_api/`) with live metrics, logs, traces, and alerts; application CRUD; reliability catalogs and runbook UI. Operational runbooks (`docs/runbooks/`, ADR-027) manually validated on kind cluster `krp`. Full observability stack, SRE practices, incident simulation, and PostgreSQL monitoring verified. **Milestone 15 — Runbook Knowledge Assistant (RAG)** is next.

## What This Project Is

The Kubernetes Reliability Platform is a hands-on learning and demonstration project that builds a small set of Python/FastAPI microservices and progressively layers operational engineering capabilities on top — from local development through Docker, Kubernetes, observability, SRE practices, incident simulation, runbooks, and a browser-based operator console.

## Why It Exists

Modern platform and SRE engineering requires practical experience across application development, containerization, orchestration, observability, incident management, and reliability practices. This project provides a structured, incremental path to learn and demonstrate those skills using a deliberately simple business domain.

## Goals

- Learn and demonstrate Python backend development with FastAPI
- Build and operate three microservices with realistic service-to-service communication
- Progress through Docker, Kubernetes, Helm, and CI/CD
- Implement full observability: metrics, logging, tracing, and alerting
- Practice SRE concepts: SLIs, SLOs, error budgets, incident response, and runbooks
- Simulate failures and practice operational response using runbooks
- Operate a Live Observability Console for day-to-day investigation workflows (Milestone 14)
- Introduce a Runbook Knowledge Assistant (RAG) for grounded operational guidance (Milestone 15 — planned)

## Scope

**In scope:**

- Three microservices: User, Order, Payment (implemented)
- PostgreSQL database (implemented)
- Docker and Docker Compose local orchestration (implemented)
- Local Kubernetes (kind) and Helm chart packaging (implemented)
- GitHub Actions CI/CD (implemented)
- Application metrics, alerting, logging, and tracing (implemented and verified)
- SRE practices: SLIs, SLOs, error budgets, and SRE alerting (implemented)
- Incident simulation scripts and operational runbooks (implemented)
- Live Observability Console — React frontend and Observability BFF (implemented — Milestone 14)
- Runbook Knowledge Assistant (RAG) — planned (Milestone 15)

**Out of scope:**

- Complex business logic or domain modeling
- AWS or cloud-specific infrastructure for the core implementation
- Production-grade multi-region deployment
- Java, Spring Boot, or Maven-based services
- Premature introduction of technologies before their milestone

## Current Capabilities

1. Running microservices locally, in Docker Compose, and in Kubernetes
2. Automated CI/CD pipelines (GitHub Actions)
3. Prometheus metrics, Grafana dashboards, and Alertmanager alerting
4. Centralized logging with Loki and Grafana Alloy
5. Distributed tracing with OpenTelemetry, Collector, and Tempo
6. SRE practices including SLIs, SLOs, and error budgets
7. Incident simulation for failure practice
8. Runbook-driven incident response documentation
9. Browser-based Live Observability Console with curated BFF (local development)

## Current Limitations

- **Frontend and BFF are local-only** — not containerized, not deployed via Helm, not covered by CI frontend checks
- **Observability console requires port-forwards** — BFF connects to in-cluster Prometheus, Loki, Tempo, and Alertmanager via `kubectl port-forward`
- **Reliability catalog pages are static** — Services, SLO, and Incidents pages document the model; live telemetry is on observability routes
- **Runbook duplication** — frontend embeds copies of `docs/runbooks/`; edits to docs do not automatically update the UI
- **Assistant not implemented** — `/assistant` is a placeholder for M15 RAG

## Future Engineering Scope

**Next — Milestone 15 (planned):**

- Runbook and documentation ingestion, indexing, and retrieval
- Context-aware, grounded answers via `/assistant`

**Possible later work** (not committed requirements):

- Containerize and deploy frontend and BFF through Helm
- Add frontend/BFF to CI
- Consolidate runbook sources
- Concepts from the superseded AI roadmap (tool calling, remediation) may inform future milestones but are not current scope

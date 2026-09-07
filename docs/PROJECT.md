# Kubernetes Reliability Platform

> **Current progress:** Milestones 0–10 complete. Distributed tracing with OpenTelemetry, OpenTelemetry Collector, and Grafana Tempo deployed via Helm and verified (manual E2E on kind cluster `krp`; cross-service Order → Payment traces in Grafana Explore). Structured JSON logging, Loki, Grafana Alloy, and Grafana **KRP Service Logs** dashboard deployed via Helm and verified. Alertmanager, Prometheus alert rules, and severity-based routing deployed via Helm and verified. Application metrics, Prometheus, and Grafana deployed via Helm and verified (local kind and GitHub Actions CD). Milestone 11 — SRE Practices is next.

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
- SRE practices and incident simulation
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
6. SRE practices including SLOs and error budgets
7. Incident simulation and runbook-driven response
8. AI-assisted root cause analysis with human-in-the-loop remediation

# Kubernetes Reliability Platform

> **Current progress:** Milestones 0–5 complete (microservices, automated tests, Docker Compose, Kubernetes on kind, Helm chart packaging). Milestone 6 — CI/CD is next (not started).

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
- Full observability stack
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
2. Automated CI/CD pipelines
3. Prometheus metrics, Grafana dashboards, and Alertmanager alerting
4. Centralized logging with Loki
5. Distributed tracing with OpenTelemetry
6. SRE practices including SLOs and error budgets
7. Incident simulation and runbook-driven response
8. AI-assisted root cause analysis with human-in-the-loop remediation

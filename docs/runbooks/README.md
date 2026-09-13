# Milestone 13 — Operational Runbooks

> **Status:** Milestone 13 — Operational Runbooks (complete). **FR-031** — Runbooks shall document response procedures for common incidents. Manual kind E2E runbook validation **executed** on kind cluster `krp` (see [`docs/TESTING.md`](../TESTING.md); pod-crash validation: `user-service` only).

**Authority:** [ADR-025](../DECISIONS.md) — Incident Simulation Scope and Approach | [ADR-027](../DECISIONS.md) — Operational Runbook Structure and Scope

---

## Terminology Boundary

**Operational runbooks are NOT incident simulation procedures.**

| Location | Purpose |
|----------|---------|
| [`scripts/incidents/`](../../scripts/incidents/) | Executable failure **injection** scenarios for practice (Milestone 12) |
| [`docs/runbooks/`](.) | Operational **investigation**, **response**, **escalation**, **recovery**, and **verification** procedures (Milestone 13) |

- Use `scripts/incidents/` to **cause** failures for practice and runbook validation.
- Use `docs/runbooks/` to **respond** when symptoms or alerts indicate an incident.

See [`scripts/incidents/README.md`](../../scripts/incidents/README.md) for simulation procedures. Simulation scripts are referenced in each runbook's **Simulation Validation** section only — they are not the operational response procedure.

---

## Runbook Catalog

| Runbook | Incident | Primary Alerts | Simulation Script |
|---------|----------|----------------|-------------------|
| [payment-dependency-failure.md](payment-dependency-failure.md) | `payment-service` unavailable; order creation fails on `POST /orders` | `KRPServiceTargetDown` (`job="payment-service"`) | `scripts/incidents/payment-dependency-failure.sh` |
| [postgres-dependency-failure.md](postgres-dependency-failure.md) | Shared PostgreSQL unavailable; all application services affected | `KRPPostgresDown` | `scripts/incidents/postgres-dependency-failure.sh` |
| [application-pod-crash.md](application-pod-crash.md) | Application pod crash or unexpected restart; Deployment self-healing | `KRPServiceTargetDown` (if unavailable ≥ ~1m; may not fire for brief restarts) | `scripts/incidents/pod-crash.sh <service-name>` |

---

## Alert-to-Runbook Mapping

All alerts are defined in `helm/krp/templates/prometheus-rules-configmap.yaml`. Alertmanager uses local/null receivers only (ADR-021) — no external paging.

| Alert | Severity | Primary Runbook | Role |
|-------|----------|-----------------|------|
| `KRPServiceTargetDown` | critical | [payment-dependency-failure](payment-dependency-failure.md) when `job="payment-service"` | Application scrape target down |
| `KRPServiceTargetDown` | critical | [application-pod-crash](application-pod-crash.md) when `job` is an application service | Target down ≥ ~1m; may not fire for brief pod restarts |
| `KRPHigh5xxErrorRate` | warning | All three runbooks (contextual) | >50% 5xx ratio per `service` over 5m |
| `KRPSLOAvailabilityViolation` | warning | All three runbooks (contextual) | Sustained availability SLO miss (10m `for`) |
| `KRPSLOErrorBudgetExhausted` | warning | All three runbooks (contextual) | Error budget fully consumed (5m `for`) |
| `KRPHighP95Latency` | warning | Contextual only — no dedicated runbook | P95 latency SLO violation; deliberate firing not demonstrated on kind (ADR-024 step 13) |
| `KRPPostgresExporterDown` | critical | [postgres-dependency-failure](postgres-dependency-failure.md) | Prometheus cannot scrape `postgres-exporter` |
| `KRPPostgresDown` | critical | [postgres-dependency-failure](postgres-dependency-failure.md) | Exporter up but `pg_up == 0` — database unreachable |

**Note:** Application scrape targets (`user-service`, `order-service`, `payment-service`) may remain **UP** while PostgreSQL is **DOWN**. Use `pg_up` and `KRPPostgresDown` for database outages, not `KRPServiceTargetDown` alone.

---

## Shared Prerequisites

| Requirement | Verification |
|-------------|--------------|
| Local **kind** cluster `krp` running | `kind get clusters` |
| Namespace `krp` exists | `kubectl get namespace krp` |
| Helm release deployed | `kubectl get deployments -n krp` |
| `kubectl` configured and cluster reachable | `kubectl cluster-info` |
| Observability stack running | Prometheus, Grafana, Alertmanager, Loki, Tempo, Alloy pods ready in `krp` |

Port-forward commands and observability workflows: see [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) and [`scripts/incidents/README.md`](../../scripts/incidents/README.md).

Grafana dashboards: **KRP Service Health** (`krp-services`), **KRP Service Logs** (`krp-service-logs`), **KRP SRE** (`krp-sre`), **KRP PostgreSQL** (`krp-postgres`).

---

## Escalation Model (Local kind)

This project runs on a local kind cluster with Alertmanager null receivers. There is no PagerDuty, Slack, or email paging.

| Level | Action |
|-------|--------|
| **L1 — Operator** | Follow the runbook investigation and remediation steps |
| **L2 — Deepen investigation** | Expand to **KRP SRE** dashboard, broader Loki queries, Tempo Explore, `kubectl describe`, Kubernetes events |
| **L3 — Consult documentation** | Review [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/DECISIONS.md`](../DECISIONS.md) (ADR-025, ADR-026), [`helm/krp/README.md`](../../helm/krp/README.md) |
| **L4 — Stop and document** | Stop unsafe actions; restore known-good state; document observations and unresolved questions |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) | Development and observability workflows |
| [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) | System architecture, alerts, observability |
| [`docs/TESTING.md`](../TESTING.md) | M13 runbook validation status |
| [`helm/krp/README.md`](../../helm/krp/README.md) | Alert rules, dashboard UIDs, verification commands |
| [`scripts/incidents/README.md`](../../scripts/incidents/README.md) | Incident simulation procedures (M12) |

# Milestone 12 — Incident Simulation Procedures

Executable incident simulation scripts for the Kubernetes Reliability Platform local **kind** cluster. These scripts support **Milestone 12** incident practice: reproducible failure scenarios with observability verification.

**Terminology:** These are **incident simulation procedures** and **scenario procedures** — not operational runbooks. Runbooks belong to **Milestone 13** (FR-031).

**Authority:** [ADR-025](../../docs/DECISIONS.md) — Incident Simulation Scope and Approach.

---

## 1. Purpose

These scripts create controlled, reproducible failures on the local kind cluster (`krp`) so you can practice incident response and verify that existing observability (metrics, logs, traces, alerts, dashboards) captures failure symptoms.

They satisfy:

- **FR-030** — Incident simulation scenarios shall be executable
- **NFR-014** — Failure scenarios shall be testable and reproducible

---

## 2. Scope

### In scope

- Learning and incident practice on a **local kind** cluster
- Observability verification using the existing M7–M11 stack
- kubectl-based, reversible failure injection per ADR-025

### Out of scope

- Production chaos engineering
- Operational incident runbooks (Milestone 13)
- Network partition simulation (deferred by ADR-025)
- Artificial latency injection (deferred by ADR-025)
- Chaos Mesh, Litmus, Toxiproxy, service mesh, NetworkPolicies
- Application fault-injection endpoints

---

## 3. Prerequisites

| Requirement | Verification |
|-------------|--------------|
| kind cluster `krp` running | `kind get clusters` |
| Namespace `krp` exists | `kubectl get namespace krp` |
| Helm release deployed | `kubectl get deployments -n krp` |
| `kubectl` configured | `kubectl cluster-info` |
| Observability stack running | `kubectl get pods -n krp -l app=prometheus,app=grafana,app=loki,app=tempo` |
| postgres-exporter running (M12) | `kubectl get deployment postgres-exporter -n krp` |

Expected application Deployments (from `helm/krp/templates/`):

| Deployment | Label | Port |
|------------|-------|------|
| `user-service` | `app=user-service` | 8001 |
| `order-service` | `app=order-service` | 8002 |
| `payment-service` | `app=payment-service` | 8003 |
| `postgres` | `app=postgres` | 5432 |
| `postgres-exporter` | `app=postgres-exporter` | 9187 |

PostgreSQL PVC: `postgres-data` (must never be deleted).

### Port-forward access (observability)

```bash
kubectl port-forward -n krp svc/prometheus 9090:9090
kubectl port-forward -n krp svc/grafana 3000:3000
kubectl port-forward -n krp svc/alertmanager 9093:9093
```

Grafana dashboards: **KRP Service Health** (`krp-services`), **KRP Service Logs** (`krp-service-logs`), **KRP SRE** (`krp-sre`), **KRP PostgreSQL** (`krp-postgres`).

---

## 4. Safety

- **Local kind only** — do not run against production or shared clusters.
- **Observe before recovery** — scale-based scripts do **not** automatically restore workloads.
- **Restore after testing** — return scaled Deployments to their original replica counts.
- **Never delete PostgreSQL PVCs** — scripts scale `Deployment/postgres` only; PVC `postgres-data` is never modified.
- **No force deletion** — pod-crash uses normal `kubectl delete pod` (no `--force`, no `--grace-period=0`).
- **No namespace deletion** — scripts only affect named Deployments/Pods in namespace `krp`.

---

## 5. Scenario Catalog

### A. Payment Dependency Failure

| Field | Detail |
|-------|--------|
| **Purpose** | Simulate payment-service becoming unavailable; order creation fails when calling payment-service |
| **Trigger** | Scale `Deployment/payment-service` to 0 replicas |
| **Affected components** | `payment-service` (down); `order-service` (502/503/504 on `POST /orders`) |
| **Command** | `bash scripts/incidents/payment-dependency-failure.sh` |
| **Expected symptoms** | `up{job="payment-service"}=0`; order-service 5xx on `POST /orders`; payment dependency errors in logs/traces |
| **Observability** | See [§6 Observability checklist](#6-observability-checklist) |
| **Recovery** | `kubectl scale deployment/payment-service --replicas=<ORIGINAL> -n krp` (script prints original count) |
| **E2E status** | Script implemented; manual kind E2E **not documented** in M12 closeout |

### B. PostgreSQL Dependency Failure

| Field | Detail |
|-------|--------|
| **Purpose** | Simulate shared database unavailability affecting all application services |
| **Trigger** | Scale `Deployment/postgres` to 0 replicas (PVC `postgres-data` preserved) |
| **Affected components** | `postgres` (down); `user-service`, `order-service`, `payment-service` (DB connection errors) |
| **Command** | `bash scripts/incidents/postgres-dependency-failure.sh` |
| **Expected symptoms** | `pg_up == 0` while postgres-exporter remains scrapeable; `KRPPostgresDown` fires (~1m); HTTP 5xx on API requests; database/SQLAlchemy connection errors in logs (e.g. order-service) |
| **PostgreSQL signals** | `pg_up` (database reachable from exporter); `up{job="postgres-exporter"}` (exporter scrape target). Exporter can remain **UP** while PostgreSQL is **DOWN** |
| **Observability** | See [§6 Observability checklist](#6-observability-checklist); **KRP PostgreSQL** dashboard (`krp-postgres`) |
| **Recovery** | `kubectl scale deployment/postgres --replicas=<ORIGINAL> -n krp` (script prints original count; **do not delete PVC**) |
| **E2E status** | **Manually verified** on kind cluster `krp` (M12 closeout) |

### C. Application Pod Crash

| Field | Detail |
|-------|--------|
| **Purpose** | Simulate a pod crash and verify Kubernetes Deployment self-healing |
| **Trigger** | Delete one Running pod for the selected application service |
| **Affected components** | Chosen service (`user-service`, `order-service`, or `payment-service`) |
| **Command** | `bash scripts/incidents/pod-crash.sh <service-name>` |
| **Example** | `bash scripts/incidents/pod-crash.sh payment-service` |
| **Expected symptoms** | Brief pod unavailability; transient request errors; replacement pod becomes Ready |
| **Observability** | See [§6 Observability checklist](#6-observability-checklist) |
| **Recovery** | Automatic via Deployment controller; script verifies replacement pod Ready |
| **E2E status** | Script implemented; manual kind E2E **not documented** in M12 closeout |

---

## 6. Observability Checklist

For every incident, verify where applicable:

### Metrics

- [ ] Prometheus targets: `up{job=...}`
- [ ] PostgreSQL: `pg_up` and `up{job="postgres-exporter"}` (for database scenarios)
- [ ] HTTP error rates: `rate(http_requests_total{status=~"5.."}[5m])`
- [ ] **KRP Service Health** dashboard (`krp-services`)
- [ ] **KRP SRE** dashboard (`krp-sre`) — SLI/SLO/error budget if failures are sustained
- [ ] **KRP PostgreSQL** dashboard (`krp-postgres`) — database status, connections, size

### Logs

- [ ] **KRP Service Logs** dashboard (`krp-service-logs`)
- [ ] Loki Explore: `{namespace="krp", service="<service>", level=~"ERROR|WARNING"}`

### Traces

- [ ] Grafana Explore → Tempo datasource (`uid: tempo`)
- [ ] Generate `POST /orders` during payment failure to observe order-to-payment dependency behavior

### Alerts

- [ ] Existing alerts only: `KRPServiceTargetDown`, `KRPHigh5xxErrorRate`, `KRPSLOAvailabilityViolation`, `KRPSLOErrorBudgetExhausted`, `KRPHighP95Latency`, `KRPPostgresExporterDown`, `KRPPostgresDown`
- [ ] **Alert timing caveat:** firing depends on Prometheus scrape interval (15s) and each rule's `for` duration (1m–10m)
- [ ] **Do not assume** short incidents will trigger alerts — verify actual behavior during manual E2E

---

## 7. Recovery

### Scale-based scenarios (payment, postgres)

The script records the **original replica count** and prints recovery commands. Example:

```bash
# Restore payment-service (use the count printed by the script)
kubectl scale deployment/payment-service --replicas=1 -n krp
kubectl rollout status deployment/payment-service -n krp --timeout=180s

# Restore postgres (PVC postgres-data is NOT touched)
kubectl scale deployment/postgres --replicas=1 -n krp
kubectl rollout status deployment/postgres -n krp --timeout=180s
```

### Pod crash scenario

Recovery is **Kubernetes self-healing**. The `pod-crash.sh` script deletes one pod and waits for the replacement to become Ready. No manual scale operation is required.

---

## 8. Known Limitations

| Limitation | Detail |
|------------|--------|
| Network partition | Deferred by ADR-025 — no approved mechanism in current stack |
| Artificial latency | Deferred by ADR-025 — no approved mechanism in current stack |
| No chaos framework | kubectl scale/delete only; not a production chaos platform |
| PostgreSQL exporter vs DB | `up{job="postgres-exporter"}=1` does not guarantee PostgreSQL is healthy — check `pg_up` |
| M12 E2E coverage | PostgreSQL dependency failure manually verified; payment and pod-crash scripts implemented without documented manual E2E |
| SLO alert timing | `KRPSLOAvailabilityViolation` / `KRPSLOErrorBudgetExhausted` require sustained failures (5–10m `for`) |
| Short pod crashes | May not trigger `KRPServiceTargetDown` if unavailable < ~1m |
| Prometheus/Tempo/Loki storage | `emptyDir` — observability history lost on pod restart (ADR-019) |
| Not runbooks | M12 scenarios are simulation procedures; M13 delivers operational runbooks |
| M11 P95 alert | `KRPHighP95Latency` not demonstrated as reproducible without latency injection |

---

## Script Reference

| Script | Action | Auto-recovery |
|--------|--------|---------------|
| `payment-dependency-failure.sh` | Scale `payment-service` → 0 | No |
| `postgres-dependency-failure.sh` | Scale `postgres` → 0 | No |
| `pod-crash.sh` | Delete one application pod | Yes (Deployment self-healing) |

All scripts use `set -euo pipefail`, validate `kubectl` and namespace `krp`, and verify target resources exist before making changes.

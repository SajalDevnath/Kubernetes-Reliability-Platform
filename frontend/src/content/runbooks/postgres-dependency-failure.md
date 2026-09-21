# PostgreSQL Dependency Failure

> **Milestone 13 — Operational Runbook**
> **Requirement:** FR-031
> **Terminology:** Operational incident response — not an incident simulation procedure.
> **Simulation script:** `scripts/incidents/postgres-dependency-failure.sh` (validation only)

**Authority:** [ADR-025](../DECISIONS.md) | [ADR-026](../DECISIONS.md)

---

## Purpose

Respond operationally when the shared PostgreSQL database is unavailable. All three application services (`user-service`, `order-service`, `payment-service`) depend on PostgreSQL at `postgres:5432/k8s_reliability`.

## Scope and Impact

| Component | Impact |
|-----------|--------|
| `postgres` | Database unavailable |
| `user-service`, `order-service`, `payment-service` | Database connection errors; HTTP 5xx on API requests |
| `postgres-exporter` | May remain running and scrapeable while PostgreSQL is down |
| Namespace | `krp` |

**Blast radius:** All application services simultaneously — shared database dependency.

## Prerequisites

- kind cluster `krp` running with namespace `krp`
- `kubectl` access to the cluster
- Observability stack deployed including `postgres-exporter`
- Port-forwards:

```bash
kubectl port-forward -n krp svc/prometheus 9090:9090
kubectl port-forward -n krp svc/grafana 3000:3000
kubectl port-forward -n krp svc/alertmanager 9093:9093
```

## Safety

- **Local kind only** — do not run remediation against production or shared clusters.
- **NEVER delete the `postgres-data` PVC** — recovery scales `Deployment/postgres` only; PVC must be preserved.
- Do not use `kubectl delete pvc`, force pod deletion with `--grace-period=0`, or namespace deletion.
- Remediation uses `kubectl scale` and rollout wait only.

## Related Alerts

| Alert | Role | Notes |
|-------|------|-------|
| **`KRPPostgresDown`** | **Primary** | `up{job="postgres-exporter"} == 1 and pg_up == 0`, `for: 1m`, `severity: critical` |
| `KRPPostgresExporterDown` | Secondary | `up{job="postgres-exporter"} == 0` — exporter scrape target down |
| `KRPHigh5xxErrorRate` | Secondary | Application 5xx if sustained traffic, `for: 2m` |
| `KRPSLOAvailabilityViolation` | Secondary | Sustained SLO miss, `for: 10m` |
| `KRPSLOErrorBudgetExhausted` | Secondary | Error budget exhausted, `for: 5m` |

**Important:** `KRPServiceTargetDown` on application jobs may **not** fire — application scrape targets can remain **UP** while the database is **DOWN**.

## Symptoms

- `pg_up == 0` — exporter cannot connect to PostgreSQL
- `up{job="postgres-exporter"} == 1` may still be true — exporter pod running, database unreachable
- HTTP 5xx or connection errors on user, order, and payment API endpoints
- **KRP PostgreSQL** (`krp-postgres`): status panels show **DOWN**
- Loki: SQLAlchemy / database connection ERROR logs across application services
- Alertmanager: `KRPPostgresDown` (after ~1m)
- Application Prometheus targets (`up{job=~"user-service|order-service|payment-service"}`) may remain `1`

### Diagnostic distinction (ADR-026)

| Metric | Meaning |
|--------|---------|
| `pg_up` | `1` — exporter can connect to PostgreSQL; `0` — database unreachable from exporter |
| `up{job="postgres-exporter"}` | `1` — Prometheus can scrape the exporter; `0` — exporter target down |

The exporter can remain **UP** while PostgreSQL is **DOWN**. Always check `pg_up` for database health.

## Initial Triage

1. Check PostgreSQL connectivity signal:

```promql
pg_up
```

2. Check exporter scrape target (separate from DB health):

```promql
up{job="postgres-exporter"}
```

3. Check postgres Deployment and pods:

```bash
kubectl get deployment postgres postgres-exporter -n krp
kubectl get pods -n krp -l app=postgres
kubectl get pvc postgres-data -n krp
```

4. Check Alertmanager: `http://127.0.0.1:9093/api/v2/alerts` for `KRPPostgresDown` or `KRPPostgresExporterDown`
5. Open **KRP PostgreSQL** (`uid: krp-postgres`) — primary dashboard for this incident

## Investigation

### Metrics (Prometheus / Grafana)

| Signal | PromQL / location |
|--------|-------------------|
| Database connectivity | `pg_up` — expect `0` during outage |
| Exporter scrape | `up{job="postgres-exporter"}` — may be `1` while DB down |
| App 5xx rate | `rate(http_requests_total{status=~"5.."}[5m])` per service |
| App target status | `up{job=~"user-service\|order-service\|payment-service"}` — may remain `1` |
| Active connections | `pg_stat_database_numbackends` (when DB recovers) |

**Grafana dashboards:**

- **KRP PostgreSQL** (`uid: krp-postgres`) — **primary** — PostgreSQL Status (`pg_up`), availability timeline
- **KRP Service Health** (`uid: krp-services`) — application HTTP symptoms
- **KRP Service Logs** (`uid: krp-service-logs`) — error log streams
- **KRP SRE** (`uid: krp-sre`) — SLI/SLO if failures are sustained

### Logs (Loki)

```logql
{namespace="krp", service=~"user-service|order-service|payment-service", level=~"ERROR|WARNING"}
```

Look for database connection failures, SQLAlchemy errors, and connectivity exceptions (e.g. order-service during verified M12 E2E).

### Traces (Tempo)

Grafana → Explore → Tempo (`uid: tempo`):

- Inspect failed API request spans during the database outage window.
- Database query spans may show errors when PostgreSQL is unavailable.

### Kubernetes Checks

```bash
kubectl get deployment postgres -n krp
kubectl get pods -n krp -l app=postgres
kubectl describe deployment postgres -n krp
kubectl get pvc postgres-data -n krp
kubectl get deployment postgres-exporter -n krp
kubectl get pods -n krp -l app=postgres-exporter
kubectl get events -n krp --sort-by='.lastTimestamp' | head -20
```

Confirm postgres pod count, PVC existence, and exporter pod status.

## Diagnosis

| Finding | Likely cause |
|---------|--------------|
| `pg_up == 0` and `up{job="postgres-exporter"} == 1` | PostgreSQL down; exporter running (primary scenario) |
| `up{job="postgres-exporter"} == 0` | Exporter unavailable — check `KRPPostgresExporterDown` path first |
| `postgres` Deployment replicas = 0 | Database scaled to zero — scale back (PVC preserved) |
| Postgres pod `CrashLoopBackOff` | Application/container failure — `kubectl logs` on postgres pod |
| PVC missing or not bound | Critical — **L4** escalation; do not delete other resources blindly |

## Remediation and Recovery

1. Confirm PVC is intact (do not delete):

```bash
kubectl get pvc postgres-data -n krp
```

2. Inspect current postgres replica count:

```bash
kubectl get deployment postgres -n krp -o jsonpath='{.spec.replicas}'
```

3. Scale postgres back to at least one replica (chart default `1`):

```bash
kubectl scale deployment/postgres --replicas=1 -n krp
kubectl rollout status deployment/postgres -n krp --timeout=180s
```

4. Confirm postgres pod is Running:

```bash
kubectl get pods -n krp -l app=postgres
```

5. Confirm database connectivity restored:

```promql
pg_up
```

6. Verify application recovery with API requests (e.g. `GET /health` on user-service, `GET /orders` on order-service).

Do **not** delete `postgres-data` PVC. Do **not** use automated remediation.

## Verification

Incident is resolved when:

- [ ] `pg_up == 1`
- [ ] `kubectl get pods -n krp -l app=postgres` shows Ready pod(s)
- [ ] PVC `postgres-data` still exists and is bound
- [ ] `KRPPostgresDown` resolves in Alertmanager (allow `for` duration and resolve timeout)
- [ ] **KRP PostgreSQL** (`krp-postgres`) shows **UP**
- [ ] Application APIs respond without database connection errors
- [ ] Application services recover (order-service DB failures cease — verified in M12 E2E)

## Escalation

| Condition | Escalation level |
|-----------|------------------|
| `pg_up` remains `0` after postgres scale/rollout | **L2** — postgres pod logs, `kubectl describe pod`, events |
| `up{job="postgres-exporter"} == 0` but postgres is up | **L2** — investigate exporter Deployment separately from DB |
| PVC `postgres-data` missing, not bound, or corrupt | **L4** — stop; document; do not delete other PVCs or namespaces |
| Only exporter down, `pg_up == 1` | Use exporter remediation path — check `postgres-exporter` Deployment |
| Recovery fails after L2 investigation | **L4** — document state; consult ADR-026 and [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) |

No external paging — Alertmanager receivers are local/null only (ADR-021).

## Alert Timing Caveats

- `KRPPostgresDown` requires `pg_up == 0` for **~1m** before firing.
- `KRPPostgresExporterDown` fires when exporter scrape target is down for **~1m** — distinct from database down.
- Application and SLO alerts require sustained conditions and traffic.
- **`KRPPostgresExporterDown` was not separately demonstrated in M12 E2E** — exporter remained running during verified PostgreSQL outage.
- Absence of an alert does not mean no incident — check `pg_up` directly.

## Related Resources

| Resource | Location |
|----------|----------|
| PostgreSQL monitoring workflow | [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) |
| ADR-026 alert semantics | [`docs/DECISIONS.md`](../DECISIONS.md) |
| Helm PostgreSQL verification | [`helm/krp/README.md`](../../helm/krp/README.md) |
| Simulation procedures | [`scripts/incidents/README.md`](../../scripts/incidents/README.md) |

## Simulation Validation

Use the M12 simulation script to **test** this runbook.

**Procedure:**

1. Confirm healthy baseline: `pg_up == 1`, `KRPPostgresDown` inactive, **KRP PostgreSQL** shows UP.
2. Inject failure: `bash scripts/incidents/postgres-dependency-failure.sh`
3. Respond using this runbook only.
4. Verify: `pg_up == 0`, `up{job="postgres-exporter"} == 1`, `KRPPostgresDown` fires (~1m), dashboard outage, application DB errors.
5. Recover per **Remediation and Recovery** section.
6. Confirm **Verification** criteria.
7. Record results in [`docs/TESTING.md`](../TESTING.md).

PostgreSQL dependency failure was **manually verified end-to-end in M12** — this runbook operationalizes that validated scenario. The operational runbook was also **manually validated during M13** on kind cluster `krp` (see [`docs/TESTING.md`](../TESTING.md)).

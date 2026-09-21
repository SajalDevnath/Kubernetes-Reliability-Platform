# Payment Dependency Failure

> **Milestone 13 — Operational Runbook**
> **Requirement:** FR-031
> **Terminology:** Operational incident response — not an incident simulation procedure.
> **Simulation script:** `scripts/incidents/payment-dependency-failure.sh` (validation only)

**Authority:** [ADR-025](../DECISIONS.md)

---

## Purpose

Respond operationally when `payment-service` is unavailable and order creation fails because Order Service cannot reach Payment Service synchronously on `POST /orders`.

## Scope and Impact

| Component | Impact |
|-----------|--------|
| `payment-service` | Unavailable — Prometheus scrape target down |
| `order-service` | `POST /orders` returns HTTP 502/503/504 when calling payment-service |
| `user-service` | Not directly affected unless orders are created |
| Namespace | `krp` |

Order Service calls Payment Service synchronously when an order is created. Payment status updates remain owned by Payment Service.

## Prerequisites

- kind cluster `krp` running with namespace `krp`
- `kubectl` access to the cluster
- Observability stack deployed (Prometheus, Grafana, Alertmanager, Loki, Tempo)
- Port-forwards (see [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md)):

```bash
kubectl port-forward -n krp svc/prometheus 9090:9090
kubectl port-forward -n krp svc/grafana 3000:3000
kubectl port-forward -n krp svc/alertmanager 9093:9093
```

## Safety

- **Local kind only** — do not run remediation against production or shared clusters.
- Remediation uses `kubectl scale` only — no force deletion, no namespace deletion.
- Do not delete PostgreSQL PVCs or other persistent data.

## Related Alerts

| Alert | Role | Notes |
|-------|------|-------|
| **`KRPServiceTargetDown`** | **Primary** | `up{job="payment-service"} == 0`, `for: 1m`, `severity: critical` |
| `KRPHigh5xxErrorRate` | Secondary | `order-service` 5xx ratio > 50% over 5m with sustained traffic, `for: 2m` |
| `KRPSLOAvailabilityViolation` | Secondary | Sustained availability SLO miss, `for: 10m` |
| `KRPSLOErrorBudgetExhausted` | Secondary | Error budget exhausted, `for: 5m` |

See [alert-to-runbook mapping](README.md#alert-to-runbook-mapping) in `docs/runbooks/README.md`.

## Symptoms

- `POST /orders` on order-service returns HTTP 502, 503, or 504
- Prometheus: `up{job="payment-service"} == 0`
- **KRP Service Health** (`krp-services`): payment-service target down; elevated 5xx on order-service
- Loki: ERROR/WARNING logs on `order-service` referencing payment dependency failures
- Tempo: failed or error spans on order → payment path during `POST /orders`
- Alertmanager: `KRPServiceTargetDown` for `payment-service` (after ~1m)

## Initial Triage

1. Confirm the incident scope — are only payment-dependent operations failing?
2. Check payment-service target status:

```promql
up{job="payment-service"}
```

3. Check order-service pod and deployment status:

```bash
kubectl get deployment payment-service order-service -n krp
kubectl get pods -n krp -l app=payment-service
kubectl get pods -n krp -l app=order-service
```

4. Check Alertmanager for active alerts: `http://127.0.0.1:9093/api/v2/alerts`
5. Rule out PostgreSQL outage — if `pg_up == 0`, use [postgres-dependency-failure.md](postgres-dependency-failure.md) instead.

## Investigation

### Metrics (Prometheus / Grafana)

| Signal | PromQL / location |
|--------|-------------------|
| Payment target down | `up{job="payment-service"}` — expect `0` |
| Order 5xx rate | `rate(http_requests_total{service="order-service",status=~"5.."}[5m])` |
| 5xx ratio (alert rule) | Per `KRPHigh5xxErrorRate` in `helm/krp/templates/prometheus-rules-configmap.yaml` |
| Availability SLI | `krp:sli:availability:ratio{service="order-service"}` |
| Error budget remaining | `krp:slo:availability:error_budget:remaining{service="order-service"}` |

**Grafana dashboards:**

- **KRP Service Health** (`uid: krp-services`) — Service Up/Availability, 5xx Error Rate, Request Rate
- **KRP SRE** (`uid: krp-sre`) — SLI/SLO/error budget if the incident is sustained

### Logs (Loki)

Grafana → Explore → Loki, or **KRP Service Logs** (`uid: krp-service-logs`):

```logql
{namespace="krp", service="order-service", level=~"ERROR|WARNING"}
```

Look for payment dependency errors, HTTP client failures, or 502/503/504 responses on the order → payment path.

### Traces (Tempo)

Grafana → Explore → Tempo (`uid: tempo`):

1. Generate or locate `POST /orders` traces during the incident window.
2. Inspect order-service spans for failed outbound calls to payment-service.
3. Confirm shared `trace_id` across order → payment where propagation succeeded before failure.

### Kubernetes Checks

```bash
kubectl get deployment payment-service -n krp
kubectl get pods -n krp -l app=payment-service
kubectl describe deployment payment-service -n krp
kubectl get endpoints payment-service -n krp
kubectl get events -n krp --field-selector involvedObject.name=payment-service --sort-by='.lastTimestamp'
```

Confirm whether `payment-service` has zero ready replicas, crash loops, or scheduling failures.

## Diagnosis

| Finding | Likely cause |
|---------|--------------|
| `up{job="payment-service"} == 0` and Deployment replicas = 0 | `payment-service` scaled to zero or not scheduled |
| Pods `CrashLoopBackOff` or `Error` | Application failure — inspect pod logs: `kubectl logs -n krp -l app=payment-service` |
| `payment-service` up but order 5xx persist | Investigate order-service → payment-service connectivity (less common on kind) |
| `pg_up == 0` simultaneously | Database outage — switch to [postgres-dependency-failure.md](postgres-dependency-failure.md) |

## Remediation and Recovery

Operational recovery restores `payment-service` availability. Use conservative `kubectl` commands only.

1. Inspect current replica count:

```bash
kubectl get deployment payment-service -n krp -o jsonpath='{.spec.replicas}'
```

2. Scale `payment-service` to at least one replica (use the count appropriate for your deployment; chart default is `1`):

```bash
kubectl scale deployment/payment-service --replicas=1 -n krp
kubectl rollout status deployment/payment-service -n krp --timeout=180s
```

3. Confirm pods are Running and Ready:

```bash
kubectl get pods -n krp -l app=payment-service
```

4. Confirm Prometheus target is up:

```promql
up{job="payment-service"}
```

Do **not** use automated remediation, force deletion, or changes outside namespace `krp`.

## Verification

Incident is resolved when:

- [ ] `up{job="payment-service"} == 1`
- [ ] `kubectl get pods -n krp -l app=payment-service` shows Ready pods
- [ ] `POST /orders` succeeds (or returns expected business errors, not 502/503/504 from payment unavailability)
- [ ] `KRPServiceTargetDown` for `payment-service` resolves in Prometheus/Alertmanager (allow alert `for` duration and resolve timeout)
- [ ] **KRP Service Health** (`krp-services`) shows payment-service target up
- [ ] Order-service ERROR/WARNING logs related to payment dependency stop appearing for new requests

## Escalation

| Condition | Escalation level |
|-----------|------------------|
| Runbook remediation does not restore `up{job="payment-service"}` | **L2** — `kubectl describe pod`, pod logs, events; check image pull and resource limits |
| `payment-service` up but orders still fail | **L2** — Tempo traces, order-service logs, `kubectl get endpoints payment-service -n krp` |
| Symptoms match multiple failure modes (e.g. `pg_up == 0`) | **L3** — consult [postgres-dependency-failure.md](postgres-dependency-failure.md), ADR-025/026 |
| Recovery fails or data safety at risk | **L4** — stop unsafe actions; document state; restore last known-good replica count |

No external paging — Alertmanager receivers are local/null only (ADR-021).

## Alert Timing Caveats

- `KRPServiceTargetDown` requires target down for **~1m** before firing.
- `KRPHigh5xxErrorRate` requires **>50% 5xx** over 5m for **~2m** — needs sustained `POST /orders` traffic.
- SLO alerts require **5–10m** sustained conditions.
- **Absence of an alert does not mean no incident occurred** — investigate metrics, logs, traces, and Kubernetes state directly.

## Related Resources

| Resource | Location |
|----------|----------|
| Simulation procedures | [`scripts/incidents/README.md`](../../scripts/incidents/README.md) |
| Architecture — alerting | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Helm alert rules | [`helm/krp/README.md`](../../helm/krp/README.md) |
| Development workflow | [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) |

## Simulation Validation

Use the M12 simulation script to **test** this runbook — the script injects the failure; this runbook guides the operational response.

**Procedure:**

1. Confirm healthy baseline on kind cluster `krp` (`up{job="payment-service"} == 1`).
2. Inject failure: `bash scripts/incidents/payment-dependency-failure.sh`
3. Respond using this runbook (Investigation → Diagnosis → Remediation → Verification sections only).
4. Verify metrics, logs, traces, and alerts where timing permits.
5. Perform operational recovery per **Remediation and Recovery** (not the simulation script's printed restore-only guidance as your sole reference).
6. Confirm **Verification** criteria.
7. Record results in [`docs/TESTING.md`](../TESTING.md).

**Do not** copy failure injection steps into the operational response flow. The simulation script is for validation only.

This runbook was **manually validated during M13** on kind cluster `krp` (see [`docs/TESTING.md`](../TESTING.md)).

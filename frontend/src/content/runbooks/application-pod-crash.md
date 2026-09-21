# Application Pod Crash

> **Milestone 13 — Operational Runbook**
> **Requirement:** FR-031
> **Terminology:** Operational incident response — not an incident simulation procedure.
> **Simulation script:** `scripts/incidents/pod-crash.sh <service-name>` (validation only)

**Authority:** [ADR-025](../DECISIONS.md)

---

## Purpose

Respond operationally when an application pod (`user-service`, `order-service`, or `payment-service`) crashes or is unexpectedly restarted. Kubernetes Deployment controller normally recreates the pod (self-healing).

## Scope and Impact

| Component | Impact |
|-----------|--------|
| Affected service | Brief unavailability during pod termination and replacement |
| Dependent callers | Transient HTTP errors during restart window (e.g. order-service callers during payment-service restart) |
| Namespace | `krp` |

**Supported services:** `user-service`, `order-service`, `payment-service`

This runbook is **symptom-first** — brief pod crashes may **not** trigger Prometheus alerts.

## Prerequisites

- kind cluster `krp` running with namespace `krp`
- `kubectl` access to the cluster
- Observability stack deployed
- Port-forwards:

```bash
kubectl port-forward -n krp svc/prometheus 9090:9090
kubectl port-forward -n krp svc/grafana 3000:3000
kubectl port-forward -n krp svc/alertmanager 9093:9093
```

## Safety

- **Local kind only** — do not run remediation against production or shared clusters.
- Do **not** use `kubectl delete pod --force` or `--grace-period=0`.
- Normal pod deletion for stuck pods only when Deployment self-healing has failed — use standard `kubectl delete pod <name>`.
- Do not delete Deployments, PVCs, or namespaces.

## Related Alerts

| Alert | Role | Notes |
|-------|------|-------|
| `KRPServiceTargetDown` | Primary/contextual | Fires if target unavailable **≥ ~1m** — brief restarts often **do not** fire |
| `KRPHigh5xxErrorRate` | Secondary/contextual | Transient 5xx during restart window if traffic is present |
| `KRPSLOAvailabilityViolation` | Secondary/contextual | Requires sustained impact (10m `for`) — unlikely for brief crash |
| `KRPSLOErrorBudgetExhausted` | Secondary/contextual | Requires sustained impact (5m `for`) |

**No alert may fire** for a brief pod crash. Investigate symptoms and Kubernetes state directly.

## Symptoms

- Pod in `Terminating`, `CrashLoopBackOff`, or missing from Ready count
- Transient HTTP 5xx or connection errors during restart window
- Possible brief dip in `up{job="<service>"}` on Prometheus
- **KRP Service Health** (`krp-services`): transient request errors or target fluctuation
- Loki: error log burst around restart time
- Tempo: interrupted or failed traces during restart window
- Replacement pod becomes `Running` and `Ready` (self-healing)

## Initial Triage

1. Identify the affected service (`user-service`, `order-service`, or `payment-service`).
2. Check pod status:

```bash
kubectl get pods -n krp -l app=<service>
kubectl get deployment <service> -n krp
```

3. Check target availability (may already be recovering):

```promql
up{job="<service>"}
```

4. Check recent events:

```bash
kubectl get events -n krp --sort-by='.lastTimestamp' | head -20
```

5. Do **not** wait for an alert — investigate Kubernetes state and symptoms first.

## Investigation

### Metrics (Prometheus / Grafana)

| Signal | PromQL / location |
|--------|-------------------|
| Target availability | `up{job="<service>"}` — may show brief `0` |
| 5xx during window | `rate(http_requests_total{service="<service>",status=~"5.."}[5m])` |

**Grafana dashboard:**

- **KRP Service Health** (`uid: krp-services`) — Service Up/Availability, 5xx Error Rate, Request Rate

### Logs (Loki)

```logql
{namespace="krp", service="<service>"}
```

Compare log streams before and after the restart. Filter errors:

```logql
{namespace="krp", service="<service>", level=~"ERROR|WARNING"}
```

Or use **KRP Service Logs** (`uid: krp-service-logs`) with service filter.

### Traces (Tempo)

Grafana → Explore → Tempo (`uid: tempo`):

- Search traces during the restart window for the affected service.
- Look for interrupted requests, error status codes, or missing downstream spans.
- For `order-service` crashes during `POST /orders`, inspect order → payment trace continuity.

### Kubernetes Checks

```bash
kubectl get deployment <service> -n krp
kubectl get pods -n krp -l app=<service> -o wide
kubectl describe pod <pod-name> -n krp
kubectl get events -n krp --field-selector involvedObject.name=<pod-name>
kubectl logs <pod-name> -n krp --previous   # if pod restarted
```

Check for OOMKilled, probe failures, image pull errors, or scheduling issues.

## Diagnosis

| Finding | Likely cause |
|---------|--------------|
| Pod deleted; replacement Ready | Expected self-healing — verify recovery only |
| `CrashLoopBackOff` | Application crash on startup — inspect logs and `kubectl describe` |
| `OOMKilled` in pod status | Resource limit exceeded |
| Readiness probe failing | Service not accepting traffic — check `/health` or `/orders` probe path |
| Repeated crashes | Underlying application bug or config — **L3** consult architecture docs |
| All services failing with DB errors | Not a pod crash — use [postgres-dependency-failure.md](postgres-dependency-failure.md) |
| Only order 5xx, payment target down | Not a pod crash — use [payment-dependency-failure.md](payment-dependency-failure.md) |

## Remediation and Recovery

**Default: Kubernetes Deployment self-healing** — no manual action required if a replacement pod becomes Ready.

1. Wait for Deployment controller to recreate the pod (up to ~180s):

```bash
kubectl wait --for=condition=Ready pod -l app=<service> -n krp --timeout=180s
```

2. If a pod is stuck `Terminating` or `CrashLoopBackOff` after reasonable wait, inspect with `kubectl describe pod` and `kubectl logs`.

3. Manual intervention **only if self-healing failed** — delete the stuck pod with normal delete (no `--force`):

```bash
kubectl delete pod <pod-name> -n krp
kubectl wait --for=condition=Ready pod -l app=<service> -n krp --timeout=180s
```

4. Do **not** scale to zero unless diagnosing a different incident type.

Do **not** use automated remediation or force deletion.

## Verification

Incident is resolved when:

- [ ] `kubectl get pods -n krp -l app=<service>` shows Ready pod(s)
- [ ] `up{job="<service>"} == 1` (stable)
- [ ] Service API responds (e.g. `GET /health` for user/payment; `GET /orders` for order-service)
- [ ] No ongoing `CrashLoopBackOff`
- [ ] `KRPServiceTargetDown` resolved if it fired
- [ ] New requests succeed without elevated 5xx on **KRP Service Health**

## Escalation

| Condition | Escalation level |
|-----------|------------------|
| Replacement pod not Ready within 180s | **L2** — `kubectl describe`, logs, events, probe configuration |
| Repeated crash loops | **L2** — `kubectl logs --previous`; check resource limits in Helm values |
| Crash affects multiple services simultaneously | **L3** — rule out PostgreSQL or cluster-wide issue |
| Self-healing fails; root cause unclear | **L4** — document pod state; avoid destructive actions |
| Suspected dependency failure, not pod crash | **L3** — switch to payment or postgres runbook |

No external paging — Alertmanager receivers are local/null only (ADR-021).

## Alert Timing Caveats

- `KRPServiceTargetDown` requires target down for **~1m** — **brief pod restarts often do not trigger this alert**.
- `KRPHigh5xxErrorRate` needs sustained >50% 5xx over 5m — transient errors during restart may not qualify.
- **Investigate using Kubernetes state, metrics, logs, and traces even when no alert fires.**
- Do not assume every pod crash simulation will trigger `KRPServiceTargetDown`.

## Related Resources

| Resource | Location |
|----------|----------|
| Simulation procedures | [`scripts/incidents/README.md`](../../scripts/incidents/README.md) |
| Architecture — probes | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Helm workloads | [`helm/krp/README.md`](../../helm/krp/README.md) |

## Simulation Validation

Use the M12 simulation script to **test** this runbook.

**Procedure:**

1. Confirm healthy baseline for the chosen service.
2. Inject failure: `bash scripts/incidents/pod-crash.sh <service-name>` (M13 validation used `user-service`; script also supports `order-service`, `payment-service`)
3. Respond using this runbook only (observe self-healing; do not force-delete unless remediation section applies).
4. Verify Kubernetes replacement pod Ready, metrics/logs/traces during window, alerts only if timing permits.
5. Confirm **Verification** criteria.
6. Record results in [`docs/TESTING.md`](../TESTING.md).

The simulation script deletes one pod and waits for self-healing — use it to validate this runbook, not as the operational procedure for real incidents.

This runbook was **manually validated during M13** on kind cluster `krp` using `user-service` only (see [`docs/TESTING.md`](../TESTING.md)).

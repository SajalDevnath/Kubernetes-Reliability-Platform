# krp Helm Chart

Helm chart for deploying the **Kubernetes Reliability Platform** to a local [kind](https://kind.sigs.k8s.io/) cluster. This chart packages the same topology as the Milestone 4 plain Kubernetes manifests under `k8s/`, plus Prometheus and Grafana (Milestone 7), Alertmanager with Prometheus alert rules (Milestone 8), and Loki with Grafana Alloy log collection (Milestone 9).

**Chart version:** `0.4.0` (M9 — Loki and Grafana Alloy; M8 was `0.3.0`, M7 was `0.2.0`, M5 was `0.1.0`)

> **Warning:** Default credentials in `values.yaml` are local-development placeholders only (`postgres.database.password: change_me`, `grafana.adminPassword: change_me`). **Do not use these credentials in production.**

## Relationship to `k8s/`

| Path | Purpose |
|------|---------|
| `k8s/` | Raw Kubernetes reference implementation (Milestone 4). **Not deleted or replaced.** |
| `helm/krp/` | Parameterized Helm packaging of the deployment including Prometheus, Grafana (Milestones 5 and 7), Alertmanager with alert rules (Milestone 8), and Loki with Grafana Alloy (Milestone 9). |

Both produce equivalent resources when using default values. Use `k8s/` for direct `kubectl apply` workflows; use this chart for `helm install` / `helm upgrade` workflows.

## Prerequisites

- Docker Desktop (or Docker Engine) running
- [kind](https://kind.sigs.k8s.io/) v0.33+ (tested with v0.33.0)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/) 3 or 4

## Cluster and namespace assumptions

| Setting | Default |
|---------|---------|
| kind cluster name | `krp` |
| kubectl context | `kind-krp` |
| Namespace | `krp` |

The `krp` namespace **must already exist**. This chart does not create a Namespace resource by default.

```bash
kubectl config current-context
kubectl get namespace krp
```

## Build application images

Build from the **repository root**:

```bash
docker build -f services/user_service/Dockerfile -t krp-user-service:local .
docker build -f services/order_service/Dockerfile -t krp-order-service:local .
docker build -f services/payment_service/Dockerfile -t krp-payment-service:local .
```

## Load images into kind

kind nodes do not use the host Docker registry by default:

```bash
kind load docker-image krp-user-service:local --name krp
kind load docker-image krp-order-service:local --name krp
kind load docker-image krp-payment-service:local --name krp
```

Application images default to `imagePullPolicy: Never` for local kind workflows. PostgreSQL uses the public `postgres:16` image. Prometheus (`prom/prometheus:v2.55.1`), Grafana (`grafana/grafana:11.4.0`), Alertmanager (`prom/alertmanager:v0.27.0`), Loki (`grafana/loki:3.4.2`), and Grafana Alloy (`grafana/alloy:v1.9.2`) use public images with `pullPolicy: IfNotPresent`.

## Static validation (before install)

```bash
helm lint helm/krp
helm template krp helm/krp
helm template krp helm/krp -f helm/krp/values-local.yaml
```

Inspect rendered output for namespaces, service names, ports, probes, and ConfigMap/Secret separation.

## Install and upgrade

> **Note:** If M4 resources from `k8s/` are already running in `krp`, remove them first to avoid ownership conflicts before the first Helm install.

```bash
helm upgrade --install krp helm/krp \
  --namespace krp \
  --create-namespace=false
```

With local overrides:

```bash
helm upgrade --install krp helm/krp \
  --namespace krp \
  -f helm/krp/values.yaml \
  -f helm/krp/values-local.yaml
```

Override any value on the command line:

```bash
helm upgrade --install krp helm/krp -n krp \
  --set userService.replicas=2
```

For sensitive values (e.g. database password), prefer `--set postgres.database.password=...` or a private values file **not committed to git**:

```bash
helm upgrade --install krp helm/krp -n krp \
  -f helm/krp/values.yaml \
  -f my-private-values.yaml
```

## Values files

| File | Purpose |
|------|---------|
| `values.yaml` | Baseline defaults (local kind development) |
| `values-local.yaml` | Optional non-sensitive local overrides (`pullPolicy`, `appEnv`, `logLevel`, existing PVC) |

`values-local.yaml` contains **no secrets**. For developer-specific overrides, create a private file (e.g. `values-private.yaml`) and add it to `.gitignore`.

### Reusing an existing PostgreSQL PVC (`postgres.storage.existingClaim`)

By default (`existingClaim: ""`), the chart creates a `postgres-data` PersistentVolumeClaim and mounts it in the PostgreSQL Deployment.

When migrating from the M4 `k8s/` manifests to Helm, an existing PVC may already be present in the cluster (for example, `postgres-data` from `k8s/postgres/pvc.yaml`). Set:

```yaml
postgres:
  storage:
    existingClaim: postgres-data
```

With a non-empty `existingClaim`:

- The chart **does not** render a PVC resource (avoids ownership conflicts with the existing claim).
- The PostgreSQL Deployment mounts the named existing claim instead.

`values-local.yaml` sets `existingClaim: postgres-data` for the kind cluster so database data is preserved during the M4 → M5 transition.

## Verification

```bash
kubectl get pods,svc -n krp
kubectl wait --for=condition=available deployment/postgres -n krp --timeout=180s
kubectl wait --for=condition=available deployment/user-service -n krp --timeout=180s
kubectl wait --for=condition=available deployment/payment-service -n krp --timeout=180s
kubectl wait --for=condition=available deployment/order-service -n krp --timeout=180s
kubectl wait --for=condition=available deployment/prometheus -n krp --timeout=180s
kubectl wait --for=condition=available deployment/grafana -n krp --timeout=180s
kubectl wait --for=condition=available deployment/alertmanager -n krp --timeout=180s
kubectl wait --for=condition=available deployment/loki -n krp --timeout=180s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=alloy -n krp --timeout=180s
```

Port-forward and smoke-test (from another terminal):

```bash
kubectl port-forward -n krp svc/user-service 8001:8001
curl http://localhost:8001/health
curl http://localhost:8001/metrics
```

### Monitoring verification

```bash
kubectl port-forward -n krp svc/prometheus 9090:9090
curl http://localhost:9090/-/ready
# Open http://localhost:9090/targets — all three application targets should be UP

kubectl port-forward -n krp svc/grafana 3000:3000
curl http://localhost:3000/api/health
# Login: admin / change_me (local-development placeholder)
# Dashboard: KRP Service Health (UID krp-services)
# Dashboard: KRP Service Logs (UID krp-service-logs)
```

### Logging verification

```bash
kubectl port-forward -n krp svc/loki 3100:3100
curl http://localhost:3100/ready

# Direct LogQL query (after generating application traffic)
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={namespace="krp",service="order-service"}' \
  --data-urlencode 'limit=5'

kubectl logs -n krp -l app.kubernetes.io/component=alloy --tail=20
```

Grafana provisions a Loki datasource (`uid: loki`, `http://loki:3100`, not default). Use Explore or the **KRP Service Logs** dashboard with `service` and `level` filters.

### Alerting verification

```bash
kubectl port-forward -n krp svc/alertmanager 9093:9093
curl http://localhost:9093/-/ready
# Active alerts: http://localhost:9093/api/v2/alerts

kubectl port-forward -n krp svc/prometheus 9090:9090
curl http://localhost:9090/api/v1/rules?type=alert
# Confirm KRPServiceTargetDown and KRPHigh5xxErrorRate are loaded
```

After a Helm upgrade that changes Prometheus or alert rule ConfigMaps, restart Prometheus (no checksum annotation on the Deployment):

```bash
kubectl rollout restart deployment/prometheus -n krp
kubectl rollout status deployment/prometheus -n krp --timeout=180s
```

Manual E2E alert tests on kind cluster `krp` are documented in `docs/DEVELOPMENT.md` and `docs/TESTING.md`.

## Teardown

```bash
helm uninstall krp -n krp
```

To remove PostgreSQL persistent data:

```bash
kubectl delete pvc postgres-data -n krp
```

## Workloads

| Workload | Service | Port | Probe |
|----------|---------|------|-------|
| postgres | `postgres` | 5432 | `pg_isready` |
| user-service | `user-service` | 8001 | `GET /health` |
| payment-service | `payment-service` | 8003 | `GET /health` |
| order-service | `order-service` | 8002 | `GET /orders` |
| prometheus | `prometheus` | 9090 | `GET /-/healthy`, `GET /-/ready` |
| grafana | `grafana` | 3000 | `GET /api/health` |
| alertmanager | `alertmanager` | 9093 | `GET /-/healthy`, `GET /-/ready` |
| loki | `loki` | 3100 | `GET /ready` |
| alloy | (DaemonSet) | — | `GET /-/healthy`, `GET /-/ready` |

Order Service calls Payment Service at `http://payment-service:8003` (in-cluster DNS). Prometheus scrapes application metrics at `user-service:8001/metrics`, `order-service:8002/metrics`, and `payment-service:8003/metrics` via static Service DNS (15s interval). Grafana connects to Prometheus at `http://prometheus:9090` (default datasource) and Loki at `http://loki:3100`. Prometheus forwards alerts to Alertmanager at `alertmanager:9093`. Grafana Alloy collects application pod logs and ships them to Loki.

### Prometheus alert rules (Milestone 8)

| Alert | Severity | `for` | Condition |
|-------|----------|-------|-----------|
| `KRPServiceTargetDown` | `critical` | `1m` | `up{job=~"user-service\|order-service\|payment-service"} == 0` |
| `KRPHigh5xxErrorRate` | `warning` | `2m` | 5xx request ratio `> 0.50` per `service` |

Rules are defined in ConfigMap `prometheus-rules` (`krp_alerts.yml`) and mounted at `/etc/prometheus/rules`.

### Alertmanager routing

- Default receiver: `default`
- `group_by: [alertname, service, job]`
- `group_wait: 30s`, `group_interval: 5m`, `repeat_interval: 12h`
- `severity="critical"` → `critical` receiver; `severity="warning"` → `warning` receiver
- Receivers are local/null only — no external notification integrations

Prometheus, Grafana, Alertmanager, Loki, and Alloy use non-persistent `emptyDir` storage.

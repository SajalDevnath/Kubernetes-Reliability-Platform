# Kubernetes (Milestone 4) — Local kind Deployment

This directory contains plain Kubernetes manifests for deploying the Kubernetes Reliability Platform to a local [kind](https://kind.sigs.k8s.io/) cluster.

> **Warning:** This is local kind development infrastructure only. The committed `postgres-credentials` Secret uses the repository placeholder password (`change_me`) matching `.env.example` and `docker-compose.yml`. **Do not use this credential in production.**

## Prerequisites

- Docker Desktop (or Docker Engine) running
- [kind](https://kind.sigs.k8s.io/) v0.33+ (tested with v0.33.0)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) matching the cluster version
- Python/uv environment for regression tests (optional but recommended)

## Cluster and context assumptions

This workflow assumes:

| Setting | Value |
|---------|-------|
| kind cluster name | `krp` |
| kubectl context | `kind-krp` |
| Namespace | `krp` (must exist; not created by these manifests) |

Verify before deploying:

```bash
kubectl config current-context
kubectl get namespace krp
kubectl get nodes
```

The kind cluster and `krp` namespace are expected to exist before applying manifests. Do not recreate the cluster unless necessary.

## Build application images

Build from the **repository root** using the existing Dockerfiles:

```bash
docker build -f services/user_service/Dockerfile -t krp-user-service:local .
docker build -f services/order_service/Dockerfile -t krp-order-service:local .
docker build -f services/payment_service/Dockerfile -t krp-payment-service:local .
```

## Load images into kind

kind nodes do not pull from the host Docker registry by default. Load built images into cluster `krp`:

```bash
kind load docker-image krp-user-service:local --name krp
kind load docker-image krp-order-service:local --name krp
kind load docker-image krp-payment-service:local --name krp
```

Application Deployments use `imagePullPolicy: Never` for these local tags.

PostgreSQL uses the public image `postgres:16` (pulled by the cluster).

## Deployment apply order

Apply manifests in dependency order:

```bash
# 1. PostgreSQL storage, credentials, workload, and Service
kubectl apply -f k8s/postgres/pvc.yaml
kubectl apply -f k8s/postgres/secret.yaml
kubectl apply -f k8s/postgres/deployment.yaml
kubectl apply -f k8s/postgres/service.yaml

# 2. Wait for PostgreSQL to become Ready
kubectl wait --for=condition=available deployment/postgres -n krp --timeout=180s

# 3. Application services (payment before order is recommended for rollout testing)
kubectl apply -f k8s/payment-service/
kubectl apply -f k8s/user-service/
kubectl apply -f k8s/order-service/

# 4. Wait for application Deployments
kubectl wait --for=condition=available deployment/payment-service -n krp --timeout=180s
kubectl wait --for=condition=available deployment/user-service -n krp --timeout=180s
kubectl wait --for=condition=available deployment/order-service -n krp --timeout=180s
```

Or apply each directory:

```bash
kubectl apply -f k8s/postgres/
kubectl wait --for=condition=available deployment/postgres -n krp --timeout=180s
kubectl apply -f k8s/payment-service/
kubectl apply -f k8s/user-service/
kubectl apply -f k8s/order-service/
```

## Inspect resources

```bash
kubectl get all -n krp
kubectl get pvc -n krp
kubectl get configmaps -n krp
kubectl get secrets -n krp
kubectl get endpoints -n krp
kubectl describe deployment -n krp
kubectl describe pod -n krp -l app=user-service
```

## Verify probes

Probe configuration is visible on each Pod:

```bash
kubectl describe pod -n krp -l app=postgres
kubectl describe pod -n krp -l app=user-service
kubectl describe pod -n krp -l app=payment-service
kubectl describe pod -n krp -l app=order-service
```

Expected probe behavior:

| Workload | Liveness / Readiness |
|----------|----------------------|
| postgres | `pg_isready -U app_user -d k8s_reliability` |
| user-service | `GET /health` on port 8001 |
| payment-service | `GET /health` on port 8003 |
| order-service | `GET /orders` on port 8002 (no `/health` endpoint) |

All Pods should reach `Running` with `READY 1/1` and restart count `0` under normal conditions.

## Verify service discovery (in-cluster)

Run an ephemeral curl pod in namespace `krp`:

```bash
kubectl run curl-test --rm -it --restart=Never -n krp --image=curlimages/curl -- sh
```

Inside the pod:

```sh
curl -s http://user-service:8001/health
curl -s http://payment-service:8003/health
curl -s http://order-service:8002/orders
```

## Test database-backed paths and Order → Payment

From the same curl pod (or a new one):

```sh
# Create a user
curl -s -X POST http://user-service:8001/users \
  -H "Content-Type: application/json" \
  -d '{"email":"k8s-test@example.com","full_name":"K8s Test User"}'

# Create an order (Order Service calls Payment Service synchronously)
curl -s -X POST http://order-service:8002/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"total_amount":"49.99"}'

# Verify payment was created for the order
curl -s http://payment-service:8003/payments
```

Payment status updates remain owned by Payment Service. Updating a payment to `successful` does **not** automatically change the associated order's status to `paid`.

## Remove the M4 deployment

Delete workloads (PVC is retained unless deleted separately):

```bash
kubectl delete -f k8s/order-service/
kubectl delete -f k8s/user-service/
kubectl delete -f k8s/payment-service/
kubectl delete -f k8s/postgres/
```

To remove PostgreSQL data as well:

```bash
kubectl delete pvc postgres-data -n krp
```

## Manifest layout

```
k8s/
├── README.md
├── postgres/
│   ├── pvc.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── user-service/
│   ├── configmap.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── payment-service/
│   ├── configmap.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── order-service/
    ├── configmap.yaml
    ├── deployment.yaml
    └── service.yaml
```

Configuration is externalized via ConfigMaps (non-sensitive) and the shared `postgres-credentials` Secret (database credentials). Helm packaging is Milestone 5 and is intentionally not included here.

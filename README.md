# Kubernetes Reliability Platform

A hands-on learning project that builds Python/FastAPI microservices and progressively layers operational engineering capabilities — from local development through Docker, Kubernetes, observability, SRE practices, incident simulation, runbooks, and a browser-based Live Observability Console.

> **Milestones 0–14 complete.** Application services, Docker Compose, Kubernetes (kind), Helm, CI/CD, the full observability stack (Prometheus, Grafana, Alertmanager, Loki, Alloy, Tempo, OpenTelemetry), SRE practices, incident simulation, operational runbooks, and the **M14 Live Observability Console** (React frontend + Observability BFF) are implemented. **Milestone 15 — Runbook Knowledge Assistant (RAG)** is next and not yet started. See [docs/TESTING.md](docs/TESTING.md) for verification evidence.

## Current Status

| Milestone | Name | Status |
|-----------|------|--------|
| 0 | Engineering Foundation | COMPLETE |
| 1 | User Service | COMPLETE |
| 2 | Microservices / CRUD / Workflow | COMPLETE |
| 3 | Docker / Docker Compose | COMPLETE |
| 4 | Kubernetes / kind | COMPLETE |
| 5 | Helm | COMPLETE |
| 6 | CI/CD | COMPLETE |
| 7 | Metrics / Monitoring | COMPLETE |
| 8 | Alerting | COMPLETE |
| 9 | Logging | COMPLETE |
| 10 | Distributed Tracing | COMPLETE |
| 11 | SLI / SLO / Error Budgets | COMPLETE |
| 12 | Incident Simulation | COMPLETE |
| 13 | Runbooks | COMPLETE |
| 14 | Live Observability Console | COMPLETE |
| 15 | Runbook Knowledge Assistant (RAG) | NOT STARTED — **next** |

## What KRP Provides Today

- **Three FastAPI microservices** — User, Order, and Payment with PostgreSQL
- **Container and cluster deployment** — Docker Compose, kind Kubernetes, Helm chart `helm/krp/`
- **CI/CD** — GitHub Actions CI on pull requests; CD to ephemeral kind on `main`
- **Observability stack in Kubernetes** — Prometheus, Grafana, Alertmanager, Loki, Alloy, Tempo, OpenTelemetry Collector
- **SRE practices** — SLI/SLO recording rules, error budgets, SRE alerting, Grafana dashboards
- **Incident practice** — kubectl-based simulation scripts and operational runbooks
- **Live Observability Console (M14)** — React UI with live metrics, logs, traces, and alerts; application CRUD pages; reliability catalog and runbook views

The business logic is intentionally simple. The focus is reliability engineering, not complex application development.

## M14 Live Observability Console

M14 adds a browser-based operator console that does **not** query Prometheus, Loki, Tempo, or Alertmanager directly. Instead:

1. **React/Vite frontend** (`frontend/`, port **5173**) — routing, polling, live/disconnected indicators, filters, and detail views
2. **Observability BFF** (`services/observability_api/`, port **8004**) — FastAPI backend-for-frontend with curated, allowlisted, read-only queries; response normalization; validation; timeouts; structured errors
3. **Vite dev proxy** — browser calls `/api/users`, `/api/orders`, `/api/payments`, and `/api/observability/*`; the proxy forwards to local services and the BFF

The frontend and BFF are **local development processes only**. They are not containerized and are not deployed through the Helm chart.

## Architecture

```
Browser (React/Vite :5173)
        |
        | Vite dev proxy
        |
        +--> User Service      :8001
        +--> Order Service     :8002
        +--> Payment Service   :8003
        |
        +--> Observability BFF :8004
                 |
                 +--> Prometheus    :9090  (kubectl port-forward)
                 +--> Loki            :3100  (kubectl port-forward)
                 +--> Tempo           :3200  (kubectl port-forward)
                 +--> Alertmanager    :9093  (kubectl port-forward)

Application services --> PostgreSQL

Observability backends (Prometheus, Grafana, Loki, Alloy, Tempo,
OpenTelemetry Collector, Alertmanager) --> deployed in kind via helm/krp/
```

Grafana remains available for advanced dashboards and Explore. The M14 console complements Grafana with a curated, application-focused operator UI.

## Live vs Static UI Pages

| Route | Type | Description |
|-------|------|-------------|
| `/observability/metrics` | **Live** | Service health, request metrics, live SLO, PostgreSQL metrics |
| `/observability/logs` | **Live** | Recent logs by service |
| `/observability/traces` | **Live** | Trace search and span-tree detail |
| `/observability/alerts` | **Live** | Active Alertmanager alerts |
| `/users`, `/orders`, `/payments` | **Live** | Application CRUD against backend APIs |
| `/reliability/services` | Static catalog | Documented service architecture — not live probe results |
| `/reliability/slo` | Static catalog | Configured SLO model — live measurements are on `/observability/metrics` |
| `/reliability/incidents` | Static catalog | Documented incident scenarios — not active incident status |
| `/reliability/runbooks` | Embedded docs | Runbook index; detail via `?runbook=<id>` |
| `/assistant` | Placeholder | M15 Runbook Knowledge Assistant (RAG) — not implemented |

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| Application | Python, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, uv |
| Presentation (M14) | React, TypeScript, Vite, Tailwind CSS, Radix/shadcn-style UI, Lucide |
| Observability BFF (M14) | Python, FastAPI, httpx, pydantic-settings |
| Containers | Docker, Docker Compose |
| Orchestration | Kubernetes, kind, kubectl, Helm |
| CI/CD | GitHub Actions |
| Metrics | Prometheus, PromQL |
| Visualization | Grafana |
| Alerting | Alertmanager |
| Logging | Loki, Grafana Alloy |
| Tracing | OpenTelemetry, OpenTelemetry Collector, Grafana Tempo |
| SRE | Prometheus SLI/SLO recording rules, error budgets |
| Incident practice | kubectl simulation scripts, operational runbooks |
| Next (M15) | Runbook Knowledge Assistant (RAG) — planned |

## Repository Structure

```
kubernetes-reliability-platform/
├── frontend/                    # M14 React/Vite Live Observability Console
├── services/
│   ├── user_service/            # User Service (port 8001)
│   ├── order_service/           # Order Service (port 8002)
│   ├── payment_service/         # Payment Service (port 8003)
│   └── observability_api/       # M14 Observability BFF (port 8004)
├── tests/                       # Backend pytest suite (314 tests)
├── docs/                        # Project documentation
├── helm/krp/                    # Helm chart (application + observability stack)
├── k8s/                         # M4 reference Kubernetes manifests
├── scripts/incidents/           # M12 incident simulation scripts
├── docker-compose.yml
├── .env.example
└── README.md
```

## Prerequisites

| Tool | Purpose |
|------|---------|
| Python 3.10+ | Application services and Observability BFF |
| [uv](https://docs.astral.sh/uv/) | Python dependency management |
| Node.js + npm | M14 frontend (`frontend/`) |
| PostgreSQL | Local application services and integration tests |
| Docker + Docker Compose | Containerized local stack (M3) |
| kind, kubectl, Helm | Kubernetes deployment (M4–M5) |
| kind cluster `krp` with Helm release | Observability backends for M14 console |

## Quick Start — Application Services (uv)

```bash
python -m uv sync --dev
cp .env.example .env   # adjust PostgreSQL credentials if needed

python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir services/user_service
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8002 --app-dir services/order_service
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8003 --app-dir services/payment_service
```

## Kubernetes / Helm

Deploy the platform and observability stack to the local kind cluster:

```bash
# See helm/krp/README.md for full install, upgrade, and image-load workflow
helm upgrade --install krp helm/krp/ -n krp
```

Plain YAML manifests under `k8s/` remain as the M4 reference implementation. See [k8s/README.md](k8s/README.md) and [helm/krp/README.md](helm/krp/README.md).

The Helm chart deploys application services and observability infrastructure. It does **not** deploy the React frontend or Observability BFF.

## M14 Console — Observability Port-Forwards

The Observability BFF connects to cluster observability services via `localhost`. With the kind cluster and Helm release running, forward the backends:

```bash
kubectl port-forward -n krp svc/prometheus 9090:9090
kubectl port-forward -n krp svc/loki 3100:3100
kubectl port-forward -n krp svc/tempo 3200:3200
kubectl port-forward -n krp svc/alertmanager 9093:9093
```

Optional — use in-cluster application services instead of local uv processes:

```bash
kubectl port-forward -n krp svc/user-service 8001:8001
kubectl port-forward -n krp svc/order-service 8002:8002
kubectl port-forward -n krp svc/payment-service 8003:8003
```

## M14 Console — BFF Startup

```bash
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8004 --app-dir services/observability_api
```

Verify: `curl http://127.0.0.1:8004/health` and `curl http://127.0.0.1:8004/api/observability/health`

Upstream URLs are configurable via environment variables (see `.env.example`).

## M14 Console — Frontend Startup

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite dev server proxies API calls to local services and the BFF.

## M14 Local Verification

With port-forwards, BFF, frontend, and application services running:

| Check | URL / action |
|-------|----------------|
| Overview | `http://127.0.0.1:5173/` |
| Live metrics | `http://127.0.0.1:5173/observability/metrics` — Live indicator; service health and SLO data |
| Live logs | `http://127.0.0.1:5173/observability/logs` |
| Live traces | `http://127.0.0.1:5173/observability/traces` |
| Live alerts | `http://127.0.0.1:5173/observability/alerts` |
| Application CRUD | `/users`, `/orders`, `/payments` |
| Runbooks | `/reliability/runbooks` and `/reliability/runbooks?runbook=postgres-dependency-failure` |
| Assistant placeholder | `/assistant` — shows M15 planned state |

If observability backends are unreachable, observability pages show a **Disconnected** state.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full M14 Console Startup Checklist.

## Docker Compose

```bash
docker compose config
docker compose build
docker compose up -d
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8003/health
curl http://127.0.0.1:8002/orders
```

Stop with `docker compose down` (omit `-v` to preserve the PostgreSQL volume).

## Testing

| Scope | Command | Count |
|-------|---------|-------|
| Full backend (includes BFF) | `uv run pytest tests/ -v` | 314 |
| Observability BFF only | `uv run pytest tests/unit/observability_api/ -q` | 134 |
| Ruff lint | `uv run ruff check services tests` | — |
| Frontend | `cd frontend && npm test -- --run` | 127 |
| Frontend build | `cd frontend && npm run build` | — |
| Frontend lint | `cd frontend && npm run lint` | — |

BFF tests are part of the full backend pytest run (`tests/unit/observability_api/`). See [docs/TESTING.md](docs/TESTING.md).

## CI Scope

| Workflow | File | Trigger | Scope |
|----------|------|---------|-------|
| **CI** | `.github/workflows/ci.yml` | `pull_request` | Ruff, full **314-test** pytest suite, Docker builds for three application services, Helm lint/template |
| **CD** | `.github/workflows/cd.yml` | `push` to `main` | Ephemeral kind deploy of `helm/krp/`, smoke tests, cluster cleanup |

CI and CD do **not** currently run frontend tests, frontend builds, or Observability BFF-specific checks. CD does not deploy the M14 console.

## Documentation

| Document | Description |
|----------|-------------|
| [Project Master Specification](PROJECT_MASTER_SPECIFICATION.md) | Single source of truth |
| [AGENTS.md](AGENTS.md) | AI assistant operating instructions |
| [Project Overview](docs/PROJECT.md) | Goals, scope, and capabilities |
| [Architecture](docs/ARCHITECTURE.md) | System architecture |
| [Requirements](docs/REQUIREMENTS.md) | Functional and non-functional requirements |
| [Development Guide](docs/DEVELOPMENT.md) | Development workflow and M14 console setup |
| [Testing Strategy](docs/TESTING.md) | Testing approach |
| [Decisions](docs/DECISIONS.md) | Architecture decision records |
| [Roadmap](docs/ROADMAP.md) | Complete milestone roadmap |
| [Kubernetes Deployment](k8s/README.md) | kind cluster deployment guide (M4 reference) |
| [Helm Chart](helm/krp/README.md) | Helm deployment guide |
| [Incident Simulation](scripts/incidents/README.md) | M12 scenario scripts |
| [Operational Runbooks](docs/runbooks/README.md) | M13 incident response runbooks |
| [Frontend](frontend/README.md) | M14 React console (local dev) |
| [Observability BFF](services/observability_api/README.md) | M14 BFF (local dev) |

## Future Scope

**Next milestone — M15 Runbook Knowledge Assistant (RAG):**

- Ingest and index runbooks and operational documentation from the repository
- Retrieval pipeline for context-aware answers grounded in project docs
- `/assistant` UI (currently a placeholder)

**Not current milestones** (superseded roadmap ideas, may inform future work):

- AI incident analyzer, tool calling, and controlled remediation were previously planned as separate milestones (old M14–M17 sequence). The current model consolidates the next AI layer into M15 RAG.

**Possible future engineering** (not committed requirements):

- Containerize and deploy frontend and BFF via Helm
- Add frontend/BFF to CI
- Consolidate duplicated runbook sources (`docs/runbooks/` vs `frontend/src/content/runbooks/`)

See [docs/ROADMAP.md](docs/ROADMAP.md) for the authoritative milestone progression.

## License

To be determined.

# Observability BFF

FastAPI backend-for-frontend for the M14 Live Observability Console.

## Purpose

Provides a curated, read-only observability API for the browser. The BFF:

- Queries Prometheus, Loki, Tempo, and Alertmanager on behalf of the frontend
- Allowlists service names and validates request parameters
- Normalizes upstream responses to stable JSON schemas
- Does **not** expose arbitrary PromQL, LogQL, or Tempo queries

The browser must not contact observability backends directly.

## Startup

From the repository root:

```bash
python -m uv run uvicorn app.main:app --host 127.0.0.1 --port 8004 --app-dir services/observability_api
```

Requires `kubectl port-forward` to in-cluster observability services. See [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md).

## Port

**8004** (default, configurable via `PORT` environment variable)

## Upstream Dependencies

| Backend | Default URL | Cluster service |
|---------|-------------|-----------------|
| Prometheus | `http://localhost:9090` | `prometheus:9090` |
| Loki | `http://localhost:3100` | `loki:3100` |
| Tempo | `http://localhost:3200` | `tempo:3200` |
| Alertmanager | `http://localhost:9093` | `alertmanager:9093` |

Configure via environment variables (see `.env.example`).

## API Route Groups

| Route | Purpose |
|-------|---------|
| `GET /health` | BFF process health |
| `GET /api/observability/health` | Upstream connectivity |
| `GET /api/observability/metrics/services` | Service scrape health |
| `GET /api/observability/metrics/requests` | HTTP request metrics |
| `GET /api/observability/metrics/slo` | Live SLO metrics |
| `GET /api/observability/metrics/postgres` | PostgreSQL metrics |
| `GET /api/observability/logs` | Recent logs by service |
| `GET /api/observability/traces` | Trace search |
| `GET /api/observability/traces/{trace_id}` | Trace detail |
| `GET /api/observability/alerts` | Active alerts |

OpenAPI docs: `http://127.0.0.1:8004/docs`

## Testing

```bash
uv run pytest tests/unit/observability_api/ -q
uv run ruff check services/observability_api
```

BFF tests are included in the full backend suite (`uv run pytest tests/ -v` — 314 tests total).

## Deployment Status

Local development only. No Dockerfile, not in Helm, not deployed to Kubernetes.

# KRP Frontend — Live Observability Console

React/Vite operator console for the Kubernetes Reliability Platform (Milestone 14).

## Stack

- React 18, TypeScript, Vite
- Tailwind CSS, Radix/shadcn-style UI components, Lucide icons
- React Router, Vitest, Testing Library

## Purpose

Browser-based UI for:

- **Live observability** — metrics, logs, traces, alerts (via Observability BFF)
- **Application CRUD** — users, orders, payments
- **Reliability catalogs** — services, SLO model, incident scenarios (static)
- **Runbooks** — embedded markdown from `src/content/runbooks/`
- **Assistant placeholder** — `/assistant` (M15 RAG)

## Startup

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

**Prerequisites:** Observability BFF on port 8004, application services on 8001–8003, and observability port-forwards. See [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md).

## Route Groups

| Group | Routes | Type |
|-------|--------|------|
| Platform | `/` | Overview |
| Application | `/users`, `/orders`, `/payments` | Live CRUD |
| Reliability | `/reliability/services`, `/reliability/slo`, `/reliability/incidents` | Static catalogs |
| Runbooks | `/reliability/runbooks`, `/reliability/runbooks?runbook=<id>` | Embedded docs |
| Observability | `/observability/metrics`, `/logs`, `/traces`, `/alerts` | Live (BFF) |
| Assistant | `/assistant` | M15 placeholder |

## Vite Proxy

`vite.config.ts` proxies API calls:

| Browser path | Target |
|--------------|--------|
| `/api/users` | `http://localhost:8001` |
| `/api/orders` | `http://localhost:8002` |
| `/api/payments` | `http://localhost:8003` |
| `/api/observability` | `http://127.0.0.1:8004` |

## Tests

```bash
npm test -- --run
npm run build
npm run lint
```

## Deployment Status

Local development only. Not containerized, not in Helm, not in CI.

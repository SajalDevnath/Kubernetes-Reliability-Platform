# Testing Strategy

> **Status:** Strategy defined. No tests exist yet — application implementation has not started.

## Philosophy

A task is not complete merely because the application starts. Every change must be tested and verified before it is considered done.

## Test Levels

### Unit Tests (Planned — Milestone 1)

- **Scope:** Individual functions, classes, and business logic
- **Location:** Co-located with service code or in `tests/` per service
- **Tools:** pytest (to be introduced in Milestone 1)
- **Status:** Planned

### Integration Tests (Planned — Milestone 2)

- **Scope:** Service + database interactions, API endpoint behavior
- **Location:** `tests/integration/`
- **Tools:** pytest, httpx, test database
- **Status:** Planned

### End-to-End Tests (Planned — Milestone 2+)

- **Scope:** Full request flows across multiple services
- **Location:** `tests/e2e/`
- **Example:** Create user → create order → process payment
- **Status:** Planned

### Container Tests (Planned — Milestone 3)

- **Scope:** Docker image builds, container startup, health checks
- **Status:** Planned

### Kubernetes Tests (Planned — Milestone 4)

- **Scope:** Deployment health, probe behavior, service discovery, scaling
- **Status:** Planned

### Failure Simulation Tests (Planned — Milestone 12)

- **Scope:** Network failures, latency injection, dependency failures
- **Purpose:** Verify observability captures failure symptoms
- **Status:** Planned

### Observability Verification (Planned — Milestones 7–10)

- **Scope:** Metrics appear in Prometheus, logs in Loki, traces in OpenTelemetry
- **Purpose:** Confirm instrumentation is correct
- **Status:** Planned

### AI Testing (Planned — Milestones 14–17)

- **Scope:** Prompt quality, tool calling accuracy, RAG retrieval, safety guardrails
- **Purpose:** Ensure AI recommendations are safe and useful
- **Status:** Planned

## Test Execution

| When | What to Run |
|------|-------------|
| Every code change | Relevant unit tests |
| Service integration | Integration tests |
| Before commit | Full test suite for changed area |
| Milestone completion | All tests for that milestone |

## Currently Available Tests

None. Application implementation has not started.

## Test Directory Structure

```
tests/
├── integration/    # Service + database integration tests (planned)
└── e2e/            # End-to-end cross-service tests (planned)
```

Unit tests will be organized within each service's package structure when Milestone 1 begins.

## Quality Gates

Before a milestone is marked complete:

1. All tests for that milestone pass
2. No regressions in previously passing tests
3. Test results are reported before commit authorization
4. New functionality has corresponding test coverage

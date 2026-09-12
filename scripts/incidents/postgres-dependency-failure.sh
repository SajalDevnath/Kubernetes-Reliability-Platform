#!/usr/bin/env bash
#
# Milestone 12 — PostgreSQL dependency failure simulation.
# Scales the postgres Deployment to zero replicas.
# NEVER deletes the postgres-data PVC or any persistent storage.
# Does NOT automatically recover. Observe the failure before restoring.
#
set -euo pipefail

readonly NAMESPACE="krp"
readonly DEPLOYMENT="postgres"
readonly APP_LABEL="app=postgres"
readonly PVC_NAME="postgres-data"
readonly CHART_DEFAULT_REPLICAS=1

validate_prerequisites() {
  if ! command -v kubectl >/dev/null 2>&1; then
    echo "ERROR: kubectl is not installed or not in PATH." >&2
    exit 1
  fi

  if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
    echo "ERROR: Namespace '${NAMESPACE}' not found." >&2
    echo "Ensure the kind cluster 'krp' is running and the Helm release is installed." >&2
    exit 1
  fi

  if ! kubectl get deployment "${DEPLOYMENT}" -n "${NAMESPACE}" >/dev/null 2>&1; then
    echo "ERROR: Deployment '${DEPLOYMENT}' not found in namespace '${NAMESPACE}'." >&2
    echo "PostgreSQL is deployed as Deployment/postgres per helm/krp/templates/postgres-deployment.yaml." >&2
    exit 1
  fi

  if kubectl get pvc "${PVC_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
    echo "Verified: PVC '${PVC_NAME}' exists (will NOT be modified or deleted)."
  else
    echo "WARNING: PVC '${PVC_NAME}' not found. Proceeding with scale-only simulation." >&2
  fi
}

wait_for_no_running_pods() {
  local attempt=0
  local max_attempts=60
  local running_count=0

  echo "Waiting for postgres pods to terminate..."
  while (( attempt < max_attempts )); do
    running_count="$(kubectl get pods -n "${NAMESPACE}" -l "${APP_LABEL}" \
      --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')"
    if [[ "${running_count}" == "0" ]]; then
      echo "Verified: no Running pods for label '${APP_LABEL}'."
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  echo "WARNING: Timed out waiting for all postgres pods to terminate." >&2
  kubectl get pods -n "${NAMESPACE}" -l "${APP_LABEL}" || true
}

print_traffic_guidance() {
  cat <<'EOF'

=== Generate traffic (manual) ===

PostgreSQL is unavailable. All application services depend on postgres (host: postgres).

Generate API traffic against any service:

  kubectl port-forward -n krp svc/user-service 8001:8001
  curl http://127.0.0.1:8001/health
  curl -X POST http://127.0.0.1:8001/users \
    -H "Content-Type: application/json" \
    -d '{"email":"db-incident@example.com","name":"DB Incident"}'

  kubectl port-forward -n krp svc/order-service 8002:8002
  curl http://127.0.0.1:8002/orders

Expect HTTP 5xx or connection errors depending on the endpoint and failure mode.

EOF
}

print_observability_guidance() {
  cat <<EOF

=== Observability checks ===

Metrics (Prometheus — port-forward: kubectl port-forward -n ${NAMESPACE} svc/prometheus 9090:9090):

  - Application 5xx:   rate(http_requests_total{status=~"5.."}[5m])
  - Per service:       rate(http_requests_total{service="user-service",status=~"5.."}[5m])
  - Target UP:         up{job=~"user-service|order-service|payment-service"}
  - PostgreSQL status: pg_up  (expect 0 — exporter cannot reach database)
  - Exporter scrape:   up{job="postgres-exporter"}  (expect 1 — exporter pod still running)
  - SLI/SLO:           krp:sli:availability:ratio (all services if sustained failures)

Alerts (existing rules only — timing depends on scrape interval and 'for' duration):

  - KRPPostgresDown             (exporter up but pg_up=0; ~1m for) — primary DB outage alert
  - KRPPostgresExporterDown     (exporter scrape target down; ~1m for)
  - KRPHigh5xxErrorRate         (if sustained 5xx traffic exceeds threshold; ~2m for)
  - KRPSLOAvailabilityViolation (sustained conditions; 5–10m)
  - KRPServiceTargetDown        (application targets may remain UP while DB is down)

  The exporter can remain scrapeable while PostgreSQL is down. Use pg_up and KRPPostgresDown.

Grafana (port-forward: kubectl port-forward -n ${NAMESPACE} svc/grafana 3000:3000):

  - KRP PostgreSQL      (uid: krp-postgres) — primary dashboard for this scenario
  - KRP Service Health  (uid: krp-services)
  - KRP Service Logs    (uid: krp-service-logs)
  - KRP SRE             (uid: krp-sre) — if failures are sustained

Logs (Grafana → Explore → Loki):

  {namespace="${NAMESPACE}", service=~"user-service|order-service|payment-service", level=~"ERROR|WARNING"}

  Look for database connection failures and SQLAlchemy connectivity errors.

Traces (Grafana → Explore → Tempo datasource uid: tempo):

  Failed API requests during the outage may show error status on service spans.

EOF
}

print_recovery_instructions() {
  local original_replicas="$1"
  local restore_replicas="${original_replicas}"

  if [[ "${original_replicas}" == "0" ]]; then
    restore_replicas="${CHART_DEFAULT_REPLICAS}"
    echo ""
    echo "NOTE: postgres was already at 0 replicas before this script ran."
    echo "      Chart default replica count is ${CHART_DEFAULT_REPLICAS}."
  fi

  cat <<EOF

=== Recovery (manual — not performed by this script) ===

Restore PostgreSQL WITHOUT touching persistent storage:

  kubectl scale deployment/${DEPLOYMENT} --replicas=${restore_replicas} -n ${NAMESPACE}
  kubectl rollout status deployment/${DEPLOYMENT} -n ${NAMESPACE} --timeout=180s
  kubectl get pods -n ${NAMESPACE} -l ${APP_LABEL}
  kubectl get pvc ${PVC_NAME} -n ${NAMESPACE}

DO NOT run: kubectl delete pvc ${PVC_NAME}

Verify application recovery:

  kubectl port-forward -n ${NAMESPACE} svc/user-service 8001:8001
  curl http://127.0.0.1:8001/health

EOF
}

main() {
  validate_prerequisites

  echo "============================================================"
  echo " Incident simulation: PostgreSQL dependency failure"
  echo "============================================================"
  echo ""
  echo "Failure: PostgreSQL will be made unavailable."
  echo "Resource: Deployment/${DEPLOYMENT} (namespace: ${NAMESPACE}, label: ${APP_LABEL})"
  echo "Impact:   user-service, order-service, and payment-service lose database connectivity."
  echo "Safety:   PVC '${PVC_NAME}' will NOT be deleted or modified."
  echo ""

  local original_replicas
  original_replicas="$(kubectl get deployment "${DEPLOYMENT}" -n "${NAMESPACE}" \
    -o jsonpath='{.spec.replicas}')"
  echo "Current desired replica count: ${original_replicas}"

  if [[ "${original_replicas}" == "0" ]]; then
    echo ""
    echo "postgres is already scaled to 0. No scale operation performed."
    wait_for_no_running_pods || true
  else
    echo ""
    echo "Scaling postgres from ${original_replicas} to 0 replicas..."
    kubectl scale deployment/"${DEPLOYMENT}" --replicas=0 -n "${NAMESPACE}"
    wait_for_no_running_pods
  fi

  echo ""
  echo "=== Failure injected ==="
  echo "PostgreSQL is unavailable. Observe metrics, logs, and traces before recovery."
  echo ""

  print_traffic_guidance
  print_observability_guidance
  print_recovery_instructions "${original_replicas}"
}

main "$@"

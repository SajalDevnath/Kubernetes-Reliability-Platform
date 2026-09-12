#!/usr/bin/env bash
#
# Milestone 12 — Payment dependency failure simulation.
# Scales the payment-service Deployment to zero replicas.
# Does NOT automatically recover. Observe the failure before restoring.
#
set -euo pipefail

readonly NAMESPACE="krp"
readonly DEPLOYMENT="payment-service"
readonly APP_LABEL="app=payment-service"
readonly PROMETHEUS_JOB="payment-service"
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
    echo "Verify helm/krp templates and that the chart is deployed." >&2
    exit 1
  fi
}

wait_for_no_running_pods() {
  local attempt=0
  local max_attempts=60
  local running_count=0

  echo "Waiting for payment-service pods to terminate..."
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

  echo "WARNING: Timed out waiting for all payment-service pods to terminate." >&2
  kubectl get pods -n "${NAMESPACE}" -l "${APP_LABEL}" || true
}

print_traffic_guidance() {
  cat <<'EOF'

=== Generate traffic (manual) ===

Payment-service is unavailable. Order creation calls payment-service synchronously
and should return HTTP 502/503/504 on POST /orders.

1. Ensure a user exists (port-forward user-service or use an in-cluster client):

   kubectl port-forward -n krp svc/user-service 8001:8001
   curl -X POST http://127.0.0.1:8001/users \
     -H "Content-Type: application/json" \
     -d '{"email":"incident-test@example.com","name":"Incident Test"}'

2. Generate sustained POST /orders traffic (in-cluster example):

   kubectl run curl-orders-incident --rm -it --restart=Never \
     --image=curlimages/curl:8.10.1 -n krp -- \
     sh -c 'for i in $(seq 1 30); do \
       curl -s -o /dev/null -w "HTTP %{http_code}\n" \
         -X POST http://order-service:8002/orders \
         -H "Content-Type: application/json" \
         -d "{\"user_id\":1,\"total_amount\":\"49.99\"}"; \
       sleep 2; \
     done'

   Adjust user_id if needed. Sustained failures help trigger KRPHigh5xxErrorRate (~2m for).

EOF
}

print_observability_guidance() {
  cat <<EOF

=== Observability checks ===

Metrics (Prometheus — port-forward: kubectl port-forward -n ${NAMESPACE} svc/prometheus 9090:9090):

  - Target status:  up{job="${PROMETHEUS_JOB}"}  (expect 0)
  - Order failures:  rate(http_requests_total{service="order-service",status=~"5.."}[5m])
  - 5xx ratio:       KRP Service Health dashboard (uid: krp-services)
  - SLI/SLO:         krp:sli:availability:ratio{service="order-service"}
                     krp:slo:availability:error_budget:remaining{service="order-service"}

Alerts (existing rules only — timing depends on scrape interval and 'for' duration):

  - KRPServiceTargetDown        (payment-service target; ~1m for)
  - KRPHigh5xxErrorRate         (order-service; >50% 5xx; ~2m for with sustained traffic)
  - KRPSLOAvailabilityViolation / KRPSLOErrorBudgetExhausted (sustained conditions; 5–10m)

  Short failures may NOT fire alerts. Verify actual behavior during manual E2E.

Grafana (port-forward: kubectl port-forward -n ${NAMESPACE} svc/grafana 3000:3000):

  - KRP Service Health  (uid: krp-services)
  - KRP SRE             (uid: krp-sre)
  - Alertmanager UI:     kubectl port-forward -n ${NAMESPACE} svc/alertmanager 9093:9093

Logs (Grafana → Explore → Loki, or KRP Service Logs dashboard uid: krp-service-logs):

  {namespace="${NAMESPACE}", service="order-service", level=~"ERROR|WARNING"}

Traces (Grafana → Explore → Tempo datasource uid: tempo):

  Generate POST /orders during the outage. Expect order-service spans with failed
  order-to-payment dependency behavior.

EOF
}

print_recovery_instructions() {
  local original_replicas="$1"
  local restore_replicas="${original_replicas}"

  if [[ "${original_replicas}" == "0" ]]; then
    restore_replicas="${CHART_DEFAULT_REPLICAS}"
    echo ""
    echo "NOTE: payment-service was already at 0 replicas before this script ran."
    echo "      Chart default replica count is ${CHART_DEFAULT_REPLICAS}."
  fi

  cat <<EOF

=== Recovery (manual — not performed by this script) ===

Restore payment-service to its original replica count (${restore_replicas}):

  kubectl scale deployment/${DEPLOYMENT} --replicas=${restore_replicas} -n ${NAMESPACE}
  kubectl rollout status deployment/${DEPLOYMENT} -n ${NAMESPACE} --timeout=180s
  kubectl get pods -n ${NAMESPACE} -l ${APP_LABEL}

Verify healthy operation:

  kubectl port-forward -n ${NAMESPACE} svc/payment-service 8003:8003
  curl http://127.0.0.1:8003/health

Confirm alerts resolve in Prometheus/Alertmanager after recovery.

EOF
}

main() {
  validate_prerequisites

  echo "============================================================"
  echo " Incident simulation: Payment dependency failure"
  echo "============================================================"
  echo ""
  echo "Failure: payment-service will be made unavailable."
  echo "Resource: Deployment/${DEPLOYMENT} (namespace: ${NAMESPACE}, label: ${APP_LABEL})"
  echo ""

  local original_replicas
  original_replicas="$(kubectl get deployment "${DEPLOYMENT}" -n "${NAMESPACE}" \
    -o jsonpath='{.spec.replicas}')"
  echo "Current desired replica count: ${original_replicas}"

  if [[ "${original_replicas}" == "0" ]]; then
    echo ""
    echo "payment-service is already scaled to 0. No scale operation performed."
    wait_for_no_running_pods || true
  else
    echo ""
    echo "Scaling payment-service from ${original_replicas} to 0 replicas..."
    kubectl scale deployment/"${DEPLOYMENT}" --replicas=0 -n "${NAMESPACE}"
    wait_for_no_running_pods
  fi

  echo ""
  echo "=== Failure injected ==="
  echo "payment-service is unavailable. Observe metrics, logs, and traces before recovery."
  echo ""

  print_traffic_guidance
  print_observability_guidance
  print_recovery_instructions "${original_replicas}"
}

main "$@"

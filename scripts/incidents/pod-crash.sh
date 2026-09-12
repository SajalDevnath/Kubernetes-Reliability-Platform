#!/usr/bin/env bash
#
# Milestone 12 — Application pod crash simulation.
# Deletes a single Running pod for a selected application Deployment.
# Kubernetes self-healing recreates the pod. Verifies replacement becomes Ready.
#
set -euo pipefail

readonly NAMESPACE="krp"
readonly ALLOWED_SERVICES=("user-service" "order-service" "payment-service")

usage() {
  cat <<EOF
Usage: $(basename "$0") <service-name>

Simulate an application pod crash by deleting one Running pod.

Allowed services:
  user-service
  order-service
  payment-service

Example:
  bash scripts/incidents/pod-crash.sh payment-service

EOF
}

validate_prerequisites() {
  if ! command -v kubectl >/dev/null 2>&1; then
    echo "ERROR: kubectl is not installed or not in PATH." >&2
    exit 1
  fi

  if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
    echo "ERROR: Namespace '${NAMESPACE}' not found." >&2
    exit 1
  fi
}

is_allowed_service() {
  local service="$1"
  local allowed
  for allowed in "${ALLOWED_SERVICES[@]}"; do
    if [[ "${service}" == "${allowed}" ]]; then
      return 0
    fi
  done
  return 1
}

print_observability_guidance() {
  local service="$1"

  cat <<EOF

=== Observability checks ===

Metrics (Prometheus):

  - Possible transient change:  up{job="${service}"}
  - Request errors during restart window:
    rate(http_requests_total{service="${service}",status=~"5.."}[5m])

Alerts:

  - KRPServiceTargetDown may fire if the pod is unavailable for ~1m.
  - Brief restarts often do NOT trigger alerts. Verify actual behavior during manual E2E.

Grafana:

  - KRP Service Health (uid: krp-services)

Logs (Grafana → Explore → Loki):

  {namespace="${NAMESPACE}", service="${service}"}

  Compare pre-failure and post-restart log streams.

Traces (Grafana → Explore → Tempo):

  Requests during the restart window may show failed or interrupted traces.

EOF
}

main() {
  if [[ $# -ne 1 ]]; then
    usage >&2
    exit 1
  fi

  local service="$1"
  local app_label="app=${service}"

  validate_prerequisites

  if ! is_allowed_service "${service}"; then
    echo "ERROR: Invalid service '${service}'." >&2
    usage >&2
    exit 1
  fi

  if ! kubectl get deployment "${service}" -n "${NAMESPACE}" >/dev/null 2>&1; then
    echo "ERROR: Deployment '${service}' not found in namespace '${NAMESPACE}'." >&2
    exit 1
  fi

  echo "============================================================"
  echo " Incident simulation: Application pod crash"
  echo "============================================================"
  echo ""
  echo "Service:  ${service}"
  echo "Resource: Deployment/${service} (namespace: ${NAMESPACE}, label: ${app_label})"
  echo ""

  local pod_name
  pod_name="$(kubectl get pods -n "${NAMESPACE}" -l "${app_label}" \
    --field-selector=status.phase=Running \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"

  if [[ -z "${pod_name}" ]]; then
    echo "ERROR: No Running pod found for label '${app_label}' in namespace '${NAMESPACE}'." >&2
    kubectl get pods -n "${NAMESPACE}" -l "${app_label}" || true
    exit 1
  fi

  echo "Selected pod for deletion: ${pod_name}"
  kubectl get pod "${pod_name}" -n "${NAMESPACE}" -o wide
  echo ""
  echo "Deleting pod (normal delete — no --force, no --grace-period=0)..."
  kubectl delete pod "${pod_name}" -n "${NAMESPACE}"

  echo ""
  echo "Waiting for a replacement pod to become Ready..."
  kubectl wait --for=condition=Ready pod -l "${app_label}" -n "${NAMESPACE}" --timeout=180s

  local replacement_pod
  replacement_pod="$(kubectl get pods -n "${NAMESPACE}" -l "${app_label}" \
    --field-selector=status.phase=Running \
    -o jsonpath='{.items[0].metadata.name}')"

  echo ""
  echo "=== Recovery verified (Kubernetes self-healing) ==="
  echo "Replacement pod: ${replacement_pod}"
  kubectl get pod "${replacement_pod}" -n "${NAMESPACE}" -o wide
  echo ""
  echo "Deployment status:"
  kubectl get deployment "${service}" -n "${NAMESPACE}"

  print_observability_guidance "${service}"
}

main "$@"

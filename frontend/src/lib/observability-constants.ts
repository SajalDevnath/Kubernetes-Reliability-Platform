import type { MetricServiceFilter } from "@/lib/api/types";

export const METRIC_SERVICE_OPTIONS: Array<{
  value: MetricServiceFilter | "";
  label: string;
}> = [
  { value: "", label: "All Services" },
  { value: "user-service", label: "User Service" },
  { value: "order-service", label: "Order Service" },
  { value: "payment-service", label: "Payment Service" },
];

export const LOG_SERVICE_OPTIONS = METRIC_SERVICE_OPTIONS.filter(
  (option): option is { value: MetricServiceFilter; label: string } =>
    option.value !== "",
);

export const LOGS_DEFAULT_LIMIT = 50;

export const TRACE_SERVICE_OPTIONS = METRIC_SERVICE_OPTIONS;

export const TRACES_DEFAULT_LIMIT = 20;

export const POLL_INTERVALS = {
  serviceHealth: 5_000,
  observabilityHealth: 30_000,
  requestMetrics: 10_000,
  postgres: 10_000,
  slo: 30_000,
  logs: 5_000,
  traces: 5_000,
  alerts: 5_000,
} as const;

export const GRAFANA_LINKS = {
  services: "http://localhost:3000/d/krp-services/krp-services",
  sre: "http://localhost:3000/d/krp-sre/krp-sre",
  postgres: "http://localhost:3000/d/krp-postgres/krp-postgres",
} as const;

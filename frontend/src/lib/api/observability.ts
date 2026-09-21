import { apiRequest } from "@/lib/api/client";
import type {
  AlertsResponse,
  LogsResponse,
  MetricServiceFilter,
  ObservabilityHealthResponse,
  PostgresMetricsResponse,
  RequestMetricsResponse,
  ServiceHealthResponse,
  SloMetricsResponse,
  TraceDetailResponse,
  TracesResponse,
} from "@/lib/api/types";

const OBSERVABILITY_BASE = "/api/observability";

export interface RequestMetricsParams {
  service?: MetricServiceFilter;
  minutes?: number;
}

export async function getObservabilityHealth(): Promise<ObservabilityHealthResponse> {
  return apiRequest<ObservabilityHealthResponse>(`${OBSERVABILITY_BASE}/health`);
}

export async function getServiceHealth(): Promise<ServiceHealthResponse> {
  return apiRequest<ServiceHealthResponse>(`${OBSERVABILITY_BASE}/metrics/services`);
}

export async function getRequestMetrics(
  params: RequestMetricsParams = {},
): Promise<RequestMetricsResponse> {
  const search = new URLSearchParams();
  if (params.service) {
    search.set("service", params.service);
  }
  if (params.minutes !== undefined) {
    search.set("minutes", String(params.minutes));
  }
  const query = search.toString();
  const suffix = query ? `?${query}` : "";
  return apiRequest<RequestMetricsResponse>(
    `${OBSERVABILITY_BASE}/metrics/requests${suffix}`,
  );
}

export async function getSloMetrics(
  service: MetricServiceFilter,
): Promise<SloMetricsResponse> {
  const search = new URLSearchParams({ service });
  return apiRequest<SloMetricsResponse>(
    `${OBSERVABILITY_BASE}/metrics/slo?${search.toString()}`,
  );
}

export async function getPostgresMetrics(): Promise<PostgresMetricsResponse> {
  return apiRequest<PostgresMetricsResponse>(`${OBSERVABILITY_BASE}/metrics/postgres`);
}

export async function getLogs(
  service: MetricServiceFilter,
  limit = 50,
): Promise<LogsResponse> {
  const search = new URLSearchParams({
    service,
    limit: String(limit),
  });
  return apiRequest<LogsResponse>(
    `${OBSERVABILITY_BASE}/logs?${search.toString()}`,
  );
}

export async function getTraces(
  service?: MetricServiceFilter,
  limit = 20,
): Promise<TracesResponse> {
  const search = new URLSearchParams({ limit: String(limit) });
  if (service) {
    search.set("service", service);
  }
  return apiRequest<TracesResponse>(
    `${OBSERVABILITY_BASE}/traces?${search.toString()}`,
  );
}

export async function getTrace(traceId: string): Promise<TraceDetailResponse> {
  return apiRequest<TraceDetailResponse>(
    `${OBSERVABILITY_BASE}/traces/${traceId}`,
  );
}

export async function getAlerts(): Promise<AlertsResponse> {
  return apiRequest<AlertsResponse>(`${OBSERVABILITY_BASE}/alerts`);
}

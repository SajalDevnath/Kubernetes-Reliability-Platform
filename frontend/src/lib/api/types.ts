export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreateInput {
  email: string;
  full_name: string;
  is_active?: boolean;
}

export interface UserUpdateInput {
  email?: string;
  full_name?: string;
  is_active?: boolean;
}

export interface HealthResponse {
  status: "ok";
  service: string;
  environment: string;
}

export interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export type OrderStatus = "pending" | "paid" | "cancelled";

export interface Order {
  id: number;
  user_id: number;
  status: OrderStatus;
  total_amount: string;
  created_at: string;
  updated_at: string;
}

export interface OrderCreateInput {
  user_id: number;
  total_amount: string;
}

export interface OrderUpdateInput {
  status?: OrderStatus;
  total_amount?: string;
}

export type PaymentStatus = "pending" | "successful" | "failed";

export interface Payment {
  id: number;
  order_id: number;
  amount: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface PaymentCreateInput {
  order_id: number;
  amount: string;
}

export interface PaymentUpdateInput {
  status?: PaymentStatus;
  amount?: string;
}

export type ObservabilityComponentName =
  | "bff"
  | "prometheus"
  | "loki"
  | "tempo"
  | "alertmanager";

export type ObservabilityHealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ComponentHealth {
  name: ObservabilityComponentName;
  status: "up" | "down";
  latency_ms?: number | null;
  error?: string | null;
}

export interface ObservabilityHealthResponse {
  status: ObservabilityHealthStatus;
  components: ComponentHealth[];
  checked_at: string;
}

export interface ServiceHealthItem {
  service: string;
  job: string;
  instance: string | null;
  up: boolean;
}

export interface ServiceHealthResponse {
  checked_at: string;
  services: ServiceHealthItem[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number | null;
}

export interface TimeSeries {
  labels: Record<string, string>;
  points: TimeSeriesPoint[];
}

export interface MetricsWindow {
  start: string;
  end: string;
  step_seconds: number;
}

export interface RequestMetricsSeries {
  request_rate: TimeSeries[];
  error_rate_5xx: TimeSeries[];
  latency_p95_seconds: TimeSeries[];
}

export interface RequestMetricsResponse {
  checked_at: string;
  window: MetricsWindow;
  series: RequestMetricsSeries;
}

export interface AvailabilitySlo {
  sli: number | null;
  target: number | null;
  compliant: boolean | null;
  error_budget_remaining: number | null;
  error_budget_consumed: number | null;
}

export interface LatencySlo {
  p95_seconds: number | null;
  target_seconds: number;
  compliant: boolean | null;
}

export interface SloDiagnostics {
  error_rate_5xx_ratio: number | null;
  request_rate_5m: number | null;
}

export interface SloMetricsResponse {
  checked_at: string;
  service: string;
  availability: AvailabilitySlo;
  latency: LatencySlo;
  diagnostics: SloDiagnostics;
}

export interface PostgresStatus {
  up: boolean | null;
  datname: string;
}

export interface ExporterStatus {
  up: boolean | null;
  instance: string | null;
}

export interface PostgresMetricsResponse {
  checked_at: string;
  postgres: PostgresStatus;
  exporter: ExporterStatus;
  connections: number | null;
  database_size_bytes: number | null;
}

export type MetricServiceFilter =
  | "user-service"
  | "order-service"
  | "payment-service";

export interface LogEntry {
  timestamp: string;
  level: string | null;
  service: string;
  logger: string | null;
  message: string;
  method: string | null;
  path: string | null;
  status_code: number | null;
  trace_id: string | null;
  span_id: string | null;
}

export interface LogsResponse {
  checked_at: string;
  service: string;
  limit: number;
  logs: LogEntry[];
}

export interface TraceSummary {
  trace_id: string;
  service: string | null;
  root_operation: string | null;
  start_time: string | null;
  duration_ms: number | null;
}

export interface TracesResponse {
  checked_at: string;
  service: string | null;
  limit: number;
  traces: TraceSummary[];
}

export interface TraceSpan {
  span_id: string;
  parent_span_id: string | null;
  name: string | null;
  kind: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_ms: number | null;
  status: string | null;
  attributes: Record<string, string | number | boolean | null>;
}

export interface TraceDetailResponse {
  checked_at: string;
  trace_id: string;
  service: string | null;
  spans: TraceSpan[];
}

export interface Alert {
  fingerprint: string;
  alert_name: string;
  status: string;
  severity: string | null;
  service: string | null;
  job: string | null;
  instance: string | null;
  summary: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  generator_url: string | null;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface AlertsResponse {
  checked_at: string;
  alerts: Alert[];
}

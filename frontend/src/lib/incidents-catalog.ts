import type { LucideIcon } from "lucide-react";
import { Container, CreditCard, Database } from "lucide-react";

export interface IncidentSignal {
  name: string;
  role: "primary" | "secondary";
}

export interface IncidentLink {
  label: string;
  href: string;
}

export interface IncidentScenario {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  symptoms: string[];
  signals: IncidentSignal[];
  investigation: string[];
  recovery: string;
  verification: string[];
  runbookDoc: string;
  runbookHref: string;
  simulationScript: string;
  links: IncidentLink[];
}

export const incidentLifecycle = [
  "Symptom",
  "Signals",
  "Investigation",
  "Runbook",
  "Recovery",
  "Verification",
] as const;

export const incidentScenarios: IncidentScenario[] = [
  {
    id: "postgres-dependency-failure",
    name: "PostgreSQL Dependency Failure",
    description:
      "Shared PostgreSQL becomes unavailable. All three application services depend on the database at postgres:5432/k8s_reliability.",
    icon: Database,
    symptoms: [
      "Database connection errors across user, order, and payment APIs",
      "pg_up can become 0 while postgres-exporter remains scrapeable",
      "Application health endpoints may still report the process as healthy",
      "HTTP 5xx or connection errors on application API requests",
    ],
    signals: [
      { name: "KRPPostgresDown", role: "primary" },
      { name: "KRPPostgresExporterDown", role: "secondary" },
      { name: "KRPHigh5xxErrorRate", role: "secondary" },
    ],
    investigation: [
      "Check pg_up and postgres-exporter scrape status in Prometheus",
      "Inspect KRP PostgreSQL dashboard (krp-postgres) for database DOWN state",
      "Review Loki for SQLAlchemy / database connection errors across services",
      "Do not rely on KRPServiceTargetDown for application jobs alone — targets may stay UP",
    ],
    recovery:
      "Restore PostgreSQL availability using kubectl scale and rollout wait. Never delete the postgres-data PVC.",
    verification: [
      "pg_up == 1",
      "postgres pods Ready and PVC postgres-data still bound",
      "KRPPostgresDown resolves in Alertmanager",
      "Application APIs recover database connectivity",
    ],
    runbookDoc: "docs/runbooks/postgres-dependency-failure.md",
    runbookHref: "/reliability/runbooks?runbook=postgres-dependency-failure",
    simulationScript: "scripts/incidents/postgres-dependency-failure.sh",
    links: [
      { label: "Services", href: "/reliability/services" },
      { label: "Metrics", href: "/observability/metrics?dashboard=krp-postgres" },
      { label: "Logs", href: "/observability/logs" },
      { label: "Alerts", href: "/observability/alerts" },
    ],
  },
  {
    id: "payment-dependency-failure",
    name: "Payment Dependency Failure",
    description:
      "Payment Service is unavailable and order creation fails because Order Service synchronously calls Payment Service on POST /orders.",
    icon: CreditCard,
    symptoms: [
      "POST /orders returns HTTP 502, 503, or 504",
      "Payment Service Prometheus target down (up{job=\"payment-service\"} == 0)",
      "Elevated order-service 5xx in KRP Service Health (krp-services)",
      "ERROR/WARNING logs on order-service referencing payment dependency failures",
    ],
    signals: [
      { name: "KRPServiceTargetDown", role: "primary" },
      { name: "KRPHigh5xxErrorRate", role: "secondary" },
      { name: "KRPSLOAvailabilityViolation", role: "secondary" },
    ],
    investigation: [
      "Confirm payment-service scrape target and pod/deployment status",
      "Inspect order-service logs and traces on the order → payment path",
      "Verify failures are limited to payment-dependent order creation",
      "Review Alertmanager for payment-service target-down alerts",
    ],
    recovery:
      "Restore payment-service availability using kubectl scale. Order Service resumes synchronous payment calls once Payment Service recovers.",
    verification: [
      "up{job=\"payment-service\"} == 1",
      "POST /orders succeeds without 502/503/504 from payment unavailability",
      "KRPServiceTargetDown for payment-service resolves if it fired",
      "KRP Service Health shows payment-service target up",
    ],
    runbookDoc: "docs/runbooks/payment-dependency-failure.md",
    runbookHref: "/reliability/runbooks?runbook=payment-dependency-failure",
    simulationScript: "scripts/incidents/payment-dependency-failure.sh",
    links: [
      { label: "Services", href: "/reliability/services" },
      { label: "Orders", href: "/orders" },
      { label: "Metrics", href: "/observability/metrics?dashboard=krp-services" },
      { label: "Logs", href: "/observability/logs" },
      { label: "Traces", href: "/observability/traces" },
      { label: "Alerts", href: "/observability/alerts" },
    ],
  },
  {
    id: "application-pod-crash",
    name: "Application Pod Crash",
    description:
      "An application pod (user-service, order-service, or payment-service) crashes or restarts unexpectedly. Kubernetes Deployment controller recreates the workload.",
    icon: Container,
    symptoms: [
      "Pod in Terminating, CrashLoopBackOff, or missing from Ready count",
      "Transient HTTP 5xx or connection errors during the restart window",
      "Brief dip in up{job=\"<service>\"} that may recover before alerts fire",
      "Replacement pod becomes Running and Ready through self-healing",
    ],
    signals: [
      { name: "KRPServiceTargetDown", role: "primary" },
      { name: "KRPHigh5xxErrorRate", role: "secondary" },
      { name: "KRPSLOAvailabilityViolation", role: "secondary" },
    ],
    investigation: [
      "Identify the affected service and inspect pod/deployment status with kubectl",
      "Check Prometheus target availability — brief outages may not trigger alerts",
      "Review Loki for error bursts and Tempo for interrupted traces around restart time",
      "Treat as symptom-first: no alert may fire for a brief crash",
    ],
    recovery:
      "Allow Kubernetes Deployment self-healing to replace the failed pod. Escalate only if the pod remains unhealthy or CrashLoopBackOff persists.",
    verification: [
      "Affected pods are Ready and deployment is healthy",
      "up{job=\"<service>\"} == 1 and stable",
      "Service API responds (GET /health or GET /orders as appropriate)",
      "KRPServiceTargetDown resolves if it fired",
    ],
    runbookDoc: "docs/runbooks/application-pod-crash.md",
    runbookHref: "/reliability/runbooks?runbook=application-pod-crash",
    simulationScript: "scripts/incidents/pod-crash.sh <service-name>",
    links: [
      { label: "Services", href: "/reliability/services" },
      { label: "Metrics", href: "/observability/metrics?dashboard=krp-services" },
      { label: "Logs", href: "/observability/logs" },
      { label: "Traces", href: "/observability/traces" },
      { label: "Alerts", href: "/observability/alerts" },
    ],
  },
];

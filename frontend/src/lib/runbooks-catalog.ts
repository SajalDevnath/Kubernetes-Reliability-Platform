import type { LucideIcon } from "lucide-react";
import { Container, CreditCard, Database } from "lucide-react";

import applicationPodCrashMd from "@/content/runbooks/application-pod-crash.md?raw";
import paymentDependencyFailureMd from "@/content/runbooks/payment-dependency-failure.md?raw";
import postgresDependencyFailureMd from "@/content/runbooks/postgres-dependency-failure.md?raw";

export interface RunbookLink {
  label: string;
  href: string;
}

export interface RunbookDocument {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  sourceDoc: string;
  simulationScript: string;
  incidentHref: string;
  content: string;
  relatedLinks: RunbookLink[];
}

export const runbookDocuments: RunbookDocument[] = [
  {
    id: "postgres-dependency-failure",
    title: "PostgreSQL Dependency Failure",
    summary:
      "Respond when shared PostgreSQL is unavailable and all application services lose database connectivity.",
    icon: Database,
    sourceDoc: "docs/runbooks/postgres-dependency-failure.md",
    simulationScript: "scripts/incidents/postgres-dependency-failure.sh",
    incidentHref: "/reliability/incidents",
    content: postgresDependencyFailureMd,
    relatedLinks: [
      { label: "Incidents", href: "/reliability/incidents" },
      { label: "Services", href: "/reliability/services" },
      { label: "SLOs", href: "/reliability/slo" },
      { label: "Metrics", href: "/observability/metrics?dashboard=krp-postgres" },
      { label: "Logs", href: "/observability/logs" },
      { label: "Traces", href: "/observability/traces" },
      { label: "Alerts", href: "/observability/alerts" },
    ],
  },
  {
    id: "payment-dependency-failure",
    title: "Payment Dependency Failure",
    summary:
      "Respond when payment-service is unavailable and order creation fails on POST /orders.",
    icon: CreditCard,
    sourceDoc: "docs/runbooks/payment-dependency-failure.md",
    simulationScript: "scripts/incidents/payment-dependency-failure.sh",
    incidentHref: "/reliability/incidents",
    content: paymentDependencyFailureMd,
    relatedLinks: [
      { label: "Incidents", href: "/reliability/incidents" },
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
    title: "Application Pod Crash",
    summary:
      "Respond when an application pod crashes or restarts and Kubernetes Deployment self-healing replaces the workload.",
    icon: Container,
    sourceDoc: "docs/runbooks/application-pod-crash.md",
    simulationScript: "scripts/incidents/pod-crash.sh <service-name>",
    incidentHref: "/reliability/incidents",
    content: applicationPodCrashMd,
    relatedLinks: [
      { label: "Incidents", href: "/reliability/incidents" },
      { label: "Services", href: "/reliability/services" },
      { label: "Metrics", href: "/observability/metrics?dashboard=krp-services" },
      { label: "Logs", href: "/observability/logs" },
      { label: "Traces", href: "/observability/traces" },
      { label: "Alerts", href: "/observability/alerts" },
    ],
  },
];

export function getRunbookById(id: string): RunbookDocument | undefined {
  return runbookDocuments.find((runbook) => runbook.id === id);
}

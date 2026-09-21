import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Gauge,
  TrendingDown,
} from "lucide-react";

export const sloTargets = {
  availability: {
    value: "99%",
    label: "Availability target",
    description: "KRP measures service availability over a 6-hour rolling window.",
  },
  latency: {
    value: "≤ 500 ms",
    label: "P95 latency target",
    description: "KRP tracks request latency using the 95th percentile.",
  },
} as const;

export const measurementWindow = {
  value: "6 hours",
  label: "Measurement window",
  description:
    "KRP evaluates availability using a rolling 6-hour window. Because the SLO calculations use a rolling window, the impact of an incident can remain visible after service recovery until the affected period rolls out of the window.",
} as const;

export const errorBudgetConcept = [
  "99% availability target",
  "1% allowed failure",
  "Error budget",
] as const;

export interface ReliabilitySignal {
  name: string;
  alertName: string;
  description: string;
  icon: LucideIcon;
}

export const reliabilitySignals: ReliabilitySignal[] = [
  {
    name: "Availability violation",
    alertName: "KRPSLOAvailabilityViolation",
    description:
      "Fires when measured availability falls below the 99% SLO target over the rolling window.",
    icon: AlertTriangle,
  },
  {
    name: "Error budget exhausted",
    alertName: "KRPSLOErrorBudgetExhausted",
    description:
      "Fires when the availability error budget is fully consumed.",
    icon: TrendingDown,
  },
  {
    name: "High P95 latency",
    alertName: "KRPHighP95Latency",
    description:
      "Fires when P95 request latency exceeds the 500 ms target.",
    icon: Gauge,
  },
];

export const operatorMentalModel = [
  "SLI",
  "SLO target",
  "Error budget",
  "Alert / violation",
  "Investigation",
] as const;

export const grafanaSreDashboard = {
  title: "KRP SRE",
  uid: "krp-sre",
  href: "/observability/metrics?dashboard=krp-sre",
  description:
    "Live SLI, SLO, and error-budget measurements are available in the KRP SRE Grafana dashboard.",
} as const;

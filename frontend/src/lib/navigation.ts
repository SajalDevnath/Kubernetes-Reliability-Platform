import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Server,
  ShoppingCart,
  Target,
  Users,
  Workflow,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navigationSections: NavSection[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Overview",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Application",
    items: [
      { title: "Users", href: "/users", icon: Users },
      { title: "Orders", href: "/orders", icon: ShoppingCart },
      { title: "Payments", href: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "Reliability",
    items: [
      { title: "Services", href: "/reliability/services", icon: Server },
      { title: "SLOs", href: "/reliability/slo", icon: Target },
      { title: "Incidents", href: "/reliability/incidents", icon: AlertTriangle },
      { title: "Runbooks", href: "/reliability/runbooks", icon: BookOpen },
    ],
  },
  {
    label: "Observability",
    items: [
      { title: "Metrics", href: "/observability/metrics", icon: BarChart3 },
      { title: "Logs", href: "/observability/logs", icon: ScrollText },
      { title: "Traces", href: "/observability/traces", icon: Workflow },
      { title: "Alerts", href: "/observability/alerts", icon: Activity },
    ],
  },
  {
    label: "Assistant",
    items: [
      {
        title: "Runbook Assistant",
        href: "/assistant",
        icon: Bot,
        badge: "M15",
      },
    ],
  },
];

export const routeMeta: Record<
  string,
  { title: string; description: string; milestone?: string }
> = {
  "/users": {
    title: "Users",
    description: "Manage platform users through the User Service API.",
    milestone: "M14",
  },
  "/orders": {
    title: "Orders",
    description: "Create and inspect orders, including Order → Payment integration.",
    milestone: "M14",
  },
  "/payments": {
    title: "Payments",
    description: "View and manage payment records from the Payment Service.",
    milestone: "M14",
  },
  "/reliability/services": {
    title: "Services",
    description: "Service health and platform component status.",
    milestone: "M14",
  },
  "/reliability/slo": {
    title: "SLOs",
    description: "Service level objectives, error budgets, and reliability targets.",
    milestone: "M14",
  },
  "/reliability/incidents": {
    title: "Incidents",
    description: "Documented incident scenarios and response context.",
    milestone: "M14",
  },
  "/reliability/runbooks": {
    title: "Runbooks",
    description: "Operational runbooks for KRP incident response procedures.",
    milestone: "M14",
  },
  "/observability/metrics": {
    title: "Metrics",
    description: "Prometheus metrics and service health signals.",
    milestone: "M14",
  },
  "/observability/logs": {
    title: "Logs",
    description: "Centralized logs via Loki and Grafana.",
    milestone: "M14",
  },
  "/observability/traces": {
    title: "Traces",
    description: "Distributed traces via OpenTelemetry and Tempo.",
    milestone: "M14",
  },
  "/observability/alerts": {
    title: "Alerts",
    description: "Alert rules and Alertmanager routing context.",
    milestone: "M14",
  },
  "/assistant": {
    title: "Runbook Assistant",
    description: "Grounded operational guidance from KRP documentation.",
    milestone: "M15",
  },
};

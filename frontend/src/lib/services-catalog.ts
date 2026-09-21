import type { LucideIcon } from "lucide-react";
import { CreditCard, ShoppingCart, Users } from "lucide-react";

export interface ServiceDependency {
  name: string;
  kind: "database" | "service";
}

export interface ServiceDefinition {
  slug: string;
  name: string;
  port: number;
  purpose: string;
  icon: LucideIcon;
  appHref: string;
  healthLabel: string;
  healthDetail: string;
  dependencies: ServiceDependency[];
  notes?: string[];
}

export const observabilityLinks = [
  { label: "Metrics", href: "/observability/metrics" },
  { label: "Logs", href: "/observability/logs" },
  { label: "Traces", href: "/observability/traces" },
] as const;

export const applicationServices: ServiceDefinition[] = [
  {
    slug: "user-service",
    name: "User Service",
    port: 8001,
    purpose: "User CRUD API backed by PostgreSQL.",
    icon: Users,
    appHref: "/users",
    healthLabel: "Health endpoint",
    healthDetail: "Process health: GET /health",
    dependencies: [{ name: "PostgreSQL", kind: "database" }],
  },
  {
    slug: "order-service",
    name: "Order Service",
    port: 8002,
    purpose: "Order CRUD API with synchronous Payment Service invocation on create.",
    icon: ShoppingCart,
    appHref: "/orders",
    healthLabel: "Operational check",
    healthDetail: "No dedicated health endpoint. Operational check: GET /orders",
    dependencies: [
      { name: "PostgreSQL", kind: "database" },
      { name: "Payment Service", kind: "service" },
    ],
    notes: [
      "Order creation synchronously calls the Payment Service.",
      "Payment dependency failures can surface as 502, 503, or 504 on POST /orders.",
      "Payment status is not automatically synchronized into order status.",
    ],
  },
  {
    slug: "payment-service",
    name: "Payment Service",
    port: 8003,
    purpose: "Payment CRUD API with pending, successful, and failed states.",
    icon: CreditCard,
    appHref: "/payments",
    healthLabel: "Health endpoint",
    healthDetail: "Process health: GET /health",
    dependencies: [{ name: "PostgreSQL", kind: "database" }],
  },
];

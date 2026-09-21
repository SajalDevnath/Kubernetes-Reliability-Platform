import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  ChevronRight,
  Container,
  CreditCard,
  Database,
  Eye,
  Radar,
  ScrollText,
  Search,
  Server,
  Shield,
  ShoppingCart,
  Target,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { FactTile } from "@/components/layout/fact-tile";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusIndicator } from "@/components/layout/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const applicationServices = [
  {
    name: "User Service",
    slug: "user-service",
    port: "8001",
    description: "User management CRUD API backed by PostgreSQL.",
    icon: Users,
    href: "/users",
  },
  {
    name: "Order Service",
    slug: "order-service",
    port: "8002",
    description: "Order management; synchronously calls Payment Service on create.",
    icon: ShoppingCart,
    href: "/orders",
  },
  {
    name: "Payment Service",
    slug: "payment-service",
    port: "8003",
    description: "Payment processing API with pending, successful, and failed states.",
    icon: CreditCard,
    href: "/payments",
  },
];

const lifecycleSteps = [
  { label: "Deploy", icon: Container },
  { label: "Observe", icon: Eye },
  { label: "Detect", icon: Radar },
  { label: "Investigate", icon: Search },
  { label: "Respond", icon: Shield },
  { label: "Recover", icon: Wrench },
];

const incidentScenarios = [
  {
    title: "Payment dependency failure",
    description:
      "Payment Service unavailable; Order Service returns 502/503/504 on POST /orders.",
    href: "/reliability/incidents",
    runbookHref: "/reliability/runbooks",
  },
  {
    title: "PostgreSQL dependency failure",
    description:
      "Shared database unavailable; all three application services lose database connectivity.",
    href: "/reliability/incidents",
    runbookHref: "/reliability/runbooks",
  },
  {
    title: "Application pod crash",
    description:
      "Application pod crash or restart; Kubernetes Deployment recreates the workload.",
    href: "/reliability/incidents",
    runbookHref: "/reliability/runbooks",
  },
];

const observabilityPillars = [
  {
    title: "Metrics",
    description: "Prometheus scrape targets and KRP Service Health dashboard",
    icon: BarChart3,
    href: "/observability/metrics",
  },
  {
    title: "Logs",
    description: "Structured JSON logs aggregated in Loki via Grafana Alloy",
    icon: ScrollText,
    href: "/observability/logs",
  },
  {
    title: "Traces",
    description: "OpenTelemetry traces exported to Tempo across service boundaries",
    icon: Workflow,
    href: "/observability/traces",
  },
  {
    title: "Alerts",
    description: "Prometheus rules routed through Alertmanager by severity",
    icon: Activity,
    href: "/observability/alerts",
  },
];

export function OverviewPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {/* A. Hero */}
      <section className="space-y-3 border-b border-border pb-6">
        <Badge variant="info" className="font-mono text-[11px] uppercase tracking-wide">
          Kubernetes Reliability Platform
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Operate, observe, and respond with intent
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          KRP is a hands-on SRE and platform engineering project demonstrating the reliability
          lifecycle of a Kubernetes-hosted microservices application — from deployment and
          observability through failure detection, incident investigation, and recovery.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded border border-border bg-card/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            FastAPI microservices
          </span>
          <span className="rounded border border-border bg-card/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            kind + Helm
          </span>
          <span className="rounded border border-border bg-card/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            Prometheus · Grafana · Loki · Tempo
          </span>
        </div>
      </section>

      {/* B. Platform at a glance */}
      <section className="space-y-3">
        <SectionHeader
          title="Platform at a glance"
          description="Documented project facts from the repository — not live runtime measurements."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FactTile
            label="Services"
            value="3"
            detail="User · Order · Payment"
            icon={Server}
          />
          <FactTile
            label="SLO target"
            value="99%"
            detail="Availability target per service (ADR-024)"
            icon={Target}
          />
          <FactTile
            label="Incident scenarios"
            value="3"
            detail="Payment · PostgreSQL · Pod crash"
            icon={AlertTriangle}
          />
          <FactTile
            label="Observability"
            value="4"
            detail="Metrics · Logs · Traces · Alerts"
            icon={BarChart3}
          />
        </div>
      </section>

      {/* C. Reliability lifecycle */}
      <section className="space-y-3">
        <SectionHeader
          title="Reliability lifecycle"
          description="The workflow KRP is built to practice — educational context, not live status."
        />
        <div className="overflow-x-auto rounded-lg border border-border bg-card/40 px-4 py-4">
          <ol className="flex min-w-[36rem] items-center gap-1">
            {lifecycleSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.label} className="flex items-center gap-1">
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
                    <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                  </div>
                  {index < lifecycleSteps.length - 1 ? (
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground/50"
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* D. Application services */}
      <section className="space-y-3">
        <SectionHeader
          title="Application services"
          description="Three FastAPI microservices on PostgreSQL. API integration is planned for a later frontend piece."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {applicationServices.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.slug}
                className="rounded-lg border border-border bg-card/50 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">{service.name}</p>
                  </div>
                  <Badge variant="muted" className="text-[10px] uppercase">API</Badge>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {service.slug}:{service.port}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <Button asChild variant="ghost" size="sm" className="mt-3 h-7 px-2 text-xs">
                  <Link to={service.href}>
                    Explore section
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          <Database className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Shared PostgreSQL database (<span className="font-mono">postgres:5432</span>) backs
            all application services.
          </span>
        </div>
      </section>

      {/* E. Reliability & incident response */}
      <section className="space-y-3">
        <SectionHeader
          title="Reliability & incident response"
          description="Documented M12 simulation scenarios with M13 operational runbooks."
        />
        <div className="space-y-2">
          {incidentScenarios.map((scenario) => (
            <div
              key={scenario.title}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{scenario.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {scenario.description}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 self-start sm:self-center">
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link to={scenario.href}>Incidents</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link to={scenario.runbookHref}>Runbooks</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/reliability/slo">SLOs & error budgets</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/reliability/services">Service reliability</Link>
          </Button>
        </div>
      </section>

      {/* F. Observability */}
      <section className="space-y-3">
        <SectionHeader
          title="Observability"
          description="Investigation surfaces are provided by Grafana and the Helm-deployed stack — not recreated here."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {observabilityPillars.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={item.href}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card/30 px-3 py-3 transition-colors hover:border-primary/25 hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* G. Live status — secondary */}
      <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Live status</p>
          <p className="text-xs text-muted-foreground">
            Service health will appear once backend integration is connected.
          </p>
        </div>
        <StatusIndicator variant="neutral" label="Not connected" />
      </section>

      {/* Future assistant — compact */}
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Runbook Knowledge Assistant</p>
              <Badge variant="muted" className="text-[10px] uppercase">M15</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Grounded operational guidance from KRP runbooks — coming in Milestone 15.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to="/assistant">View placeholder</Link>
        </Button>
      </section>
    </div>
  );
}

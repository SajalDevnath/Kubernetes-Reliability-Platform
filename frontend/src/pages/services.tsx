import { Network } from "lucide-react";

import { SectionHeader } from "@/components/layout/section-header";
import { ServiceCard } from "@/components/reliability/service-card";
import { Badge } from "@/components/ui/badge";
import { applicationServices } from "@/lib/services-catalog";

export function ServicesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-3 border-b border-border pb-6">
        <Badge variant="muted" className="font-mono text-[11px] uppercase tracking-wide">
          Documented architecture
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Services
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Application services that make up KRP and the dependencies they rely on.
          This page describes service contracts and health semantics — not live
          Kubernetes or runtime health.
        </p>
      </header>

      <section className="space-y-4">
        <SectionHeader
          title="Application services"
          description="Service definitions from the KRP backend architecture. Health semantics are documented checks, not live probe results."
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {applicationServices.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Service dependency map"
          description="High-level dependency relationships across the application layer."
        />
        <div
          className="overflow-x-auto rounded-lg border border-border bg-card/40 px-4 py-5"
          aria-label="Service dependency map"
        >
          <pre className="min-w-[20rem] font-mono text-xs leading-7 text-muted-foreground">
            <span className="text-foreground">User Service</span>
            {"    "}
            ───────→ PostgreSQL
            {"\n\n"}
            <span className="text-foreground">Order Service</span>
            {"   "}
            ──────→ PostgreSQL
            {"\n"}
            {"       "}
            │
            {"\n"}
            {"       "}
            └─────────────→{" "}
            <span className="text-foreground">Payment Service</span>
            {" "}
            ─────→ PostgreSQL
          </pre>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <Network className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p>
            Order creation calls Payment Service synchronously. Payment outcomes
            are recorded in the Payment Service; order status is managed
            separately and is not automatically synchronized from payment status.
          </p>
        </div>
      </section>
    </div>
  );
}

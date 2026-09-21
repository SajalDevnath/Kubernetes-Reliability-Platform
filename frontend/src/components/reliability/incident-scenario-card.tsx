import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { IncidentScenario } from "@/lib/incidents-catalog";
import { incidentLifecycle } from "@/lib/incidents-catalog";

interface IncidentScenarioCardProps {
  scenario: IncidentScenario;
}

export function IncidentScenarioCard({ scenario }: IncidentScenarioCardProps) {
  const Icon = scenario.icon;

  return (
    <Card className="bg-card/60">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">{scenario.name}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {scenario.description}
              </CardDescription>
            </div>
          </div>
          <Badge variant="muted" className="shrink-0 text-[10px] uppercase">
            Documented scenario
          </Badge>
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-muted/20 px-3 py-3">
          <ol className="flex min-w-[28rem] items-center gap-1">
            {incidentLifecycle.map((step, index) => (
              <li key={step} className="flex items-center gap-1">
                <span className="rounded-md border border-border bg-background/60 px-2 py-1 text-[11px] font-medium text-foreground">
                  {step}
                </span>
                {index < incidentLifecycle.length - 1 ? (
                  <ChevronDown
                    className="hidden h-3.5 w-3.5 shrink-0 rotate-[-90deg] text-muted-foreground/50 sm:block"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Symptoms
            </h3>
            <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {scenario.symptoms.map((symptom) => (
                <li key={symptom} className="flex gap-2">
                  <span className="text-muted-foreground/50" aria-hidden="true">·</span>
                  <span>{symptom}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Signals
            </h3>
            <div className="flex flex-wrap gap-2">
              {scenario.signals.map((signal) => (
                <Badge
                  key={signal.name}
                  variant={signal.role === "primary" ? "warning" : "muted"}
                  className="font-mono text-[10px]"
                >
                  {signal.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Documented alert names — not current firing state.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Investigation
            </h3>
            <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {scenario.investigation.map((step) => (
                <li key={step} className="flex gap-2">
                  <span className="text-muted-foreground/50" aria-hidden="true">·</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recovery
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {scenario.recovery}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Verification
            </h3>
            <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {scenario.verification.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-muted-foreground/50" aria-hidden="true">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-3 border-t border-border pt-4 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Runbook
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {scenario.runbookDoc}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground/80">
                Simulation reference: {scenario.simulationScript}
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link to={scenario.runbookHref}>
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Open runbook
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Investigate
            </p>
            <div className="flex flex-wrap gap-2">
              {scenario.links.map((link) => (
                <Button key={link.href} asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to={link.href}>{link.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

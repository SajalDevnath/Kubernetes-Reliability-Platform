import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Clock,
  Target,
  Timer,
  TrendingDown,
} from "lucide-react";
import { Link } from "react-router-dom";

import { SectionHeader } from "@/components/layout/section-header";
import { SloTargetCard } from "@/components/reliability/slo-target-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  errorBudgetConcept,
  grafanaSreDashboard,
  measurementWindow,
  operatorMentalModel,
  reliabilitySignals,
  sloTargets,
} from "@/lib/slo-model";

export function SloPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-3 border-b border-border pb-6">
        <Badge variant="muted" className="font-mono text-[11px] uppercase tracking-wide">
          Configured objectives
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          SLOs
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Service Level Objectives define the reliability targets KRP uses to measure
          service health and error-budget consumption. This page explains the
          configured model — not current measured compliance.
        </p>
      </header>

      <section className="space-y-4">
        <SectionHeader
          title="SLO overview"
          description="Configured reliability targets from ADR-024. Live measurements are available in Grafana."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <SloTargetCard
            icon={Target}
            value={sloTargets.availability.value}
            label={sloTargets.availability.label}
            description={sloTargets.availability.description}
          />
          <SloTargetCard
            icon={Timer}
            value={sloTargets.latency.value}
            label={sloTargets.latency.label}
            description={sloTargets.latency.description}
          />
          <SloTargetCard
            icon={TrendingDown}
            value="Error budget"
            label="Availability allowance"
            description="The error budget is the amount of unreliability permitted by the availability objective."
          >
            <div className="rounded-md border border-border bg-muted/20 px-3 py-3 font-mono text-xs text-muted-foreground">
              {errorBudgetConcept.map((step, index) => (
                <div key={step} className="flex flex-col items-center">
                  <p className={index === errorBudgetConcept.length - 1 ? "text-foreground" : undefined}>
                    {step}
                  </p>
                  {index < errorBudgetConcept.length - 1 ? (
                    <ChevronDown className="my-1 h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Remaining or consumed budget is not shown here. Inspect live error-budget
              state in Grafana.
            </p>
          </SloTargetCard>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title={measurementWindow.label}
          description="How KRP evaluates availability over time."
        />
        <Card className="bg-card/60">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {measurementWindow.value}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {measurementWindow.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Reliability signals"
          description="Documented Prometheus alert rules connected to KRP SLOs. These are monitoring concepts, not current alert state."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {reliabilitySignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <Card key={signal.alertName} className="bg-card/60">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <Badge variant="muted" className="shrink-0 text-[10px] uppercase">
                      Documented
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-sm">{signal.name}</CardTitle>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {signal.alertName}
                    </p>
                    <CardDescription className="text-xs leading-relaxed">
                      {signal.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Operator mental model"
          description="How KRP connects measurement to investigation."
        />
        <Card className="bg-card/60">
          <CardContent className="overflow-x-auto p-5">
            <ol className="flex min-w-[20rem] flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {operatorMentalModel.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-md border border-border bg-background/60 px-3 py-2 text-xs font-medium text-foreground">
                    {step}
                  </span>
                  {index < operatorMentalModel.length - 1 ? (
                    <ArrowRight
                      className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 sm:block"
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-border bg-card/40 px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {grafanaSreDashboard.title} dashboard
              </p>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {grafanaSreDashboard.description} Dashboard UID:{" "}
                <span className="font-mono">{grafanaSreDashboard.uid}</span>.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link to={grafanaSreDashboard.href}>
              Open SRE dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

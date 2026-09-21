import { AlertTriangle } from "lucide-react";

import { SectionHeader } from "@/components/layout/section-header";
import { IncidentScenarioCard } from "@/components/reliability/incident-scenario-card";
import { Badge } from "@/components/ui/badge";
import { incidentScenarios } from "@/lib/incidents-catalog";

export function IncidentsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-3 border-b border-border pb-6">
        <Badge variant="muted" className="font-mono text-[11px] uppercase tracking-wide">
          Documented scenarios
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Incidents
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Documented KRP failure scenarios designed, simulated, investigated, and
          captured in operational runbooks. This catalog explains what each
          scenario represents — not whether an incident is currently active.
        </p>
      </header>

      <section className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          M12 simulation scripts inject failures for practice. M13 runbooks document
          investigation, response, and verification. The frontend does not execute
          simulations or remediation actions.
        </p>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Incident scenario catalog"
          description="Three reproducible failure scenarios validated on the local kind cluster."
        />
        <div className="space-y-4">
          {incidentScenarios.map((scenario) => (
            <IncidentScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      </section>
    </div>
  );
}

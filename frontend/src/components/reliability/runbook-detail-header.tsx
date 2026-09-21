import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RunbookDocument } from "@/lib/runbooks-catalog";

interface RunbookDetailHeaderProps {
  runbook: RunbookDocument;
}

export function RunbookDetailHeader({ runbook }: RunbookDetailHeaderProps) {
  const Icon = runbook.icon;

  return (
    <header className="space-y-4">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 px-3 text-sm font-medium"
      >
        <Link to="/reliability/runbooks">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Runbooks
        </Link>
      </Button>

      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {runbook.title}
            </h1>
            <Badge variant="muted" className="text-[10px] uppercase">
              Documented runbook
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{runbook.summary}</p>
          <p className="font-mono text-[11px] text-muted-foreground/80">
            Source: {runbook.sourceDoc} · Simulation reference: {runbook.simulationScript}
          </p>
        </div>
      </div>
    </header>
  );
}

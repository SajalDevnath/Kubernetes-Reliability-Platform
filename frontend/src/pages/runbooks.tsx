import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { SectionHeader } from "@/components/layout/section-header";
import { BackToTopButton } from "@/components/reliability/back-to-top-button";
import { RunbookContent } from "@/components/reliability/runbook-content";
import { RunbookDetailHeader } from "@/components/reliability/runbook-detail-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRunbookById, runbookDocuments, type RunbookDocument } from "@/lib/runbooks-catalog";

function RunbookDetailView({ runbook }: { runbook: RunbookDocument }) {
  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <RunbookDetailHeader runbook={runbook} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <Card className="bg-card/60">
            <CardContent className="p-5 md:p-6">
              <RunbookContent markdown={runbook.content} />
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card className="bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Related navigation</CardTitle>
                <CardDescription className="text-xs">
                  Operational context and observability surfaces referenced by this runbook.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {runbook.relatedLinks.map((link) => (
                  <Button key={link.href} asChild variant="outline" size="sm" className="h-8 text-xs">
                    <Link to={link.href}>{link.label}</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Simulation scripts are documentation references only. The frontend does not
                  execute failure injection or remediation commands.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
      <BackToTopButton />
    </>
  );
}

export function RunbooksPage() {
  const [searchParams] = useSearchParams();
  const runbookId = searchParams.get("runbook");
  const selectedRunbook = runbookId ? getRunbookById(runbookId) : undefined;

  if (runbookId && !selectedRunbook) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
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
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <h1 className="text-lg font-semibold text-foreground">Runbook not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No documented runbook matches <span className="font-mono">{runbookId}</span>.
          </p>
          <Button asChild className="mt-4">
            <Link to="/reliability/runbooks">Return to runbook catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (selectedRunbook) {
    return <RunbookDetailView runbook={selectedRunbook} />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-3 border-b border-border pb-6">
        <Badge variant="muted" className="font-mono text-[11px] uppercase tracking-wide">
          Operational knowledge
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Runbooks
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Operational procedures for responding to documented KRP incident scenarios.
          These runbooks guide investigation, response, recovery, and verification — they
          do not represent live incident state.
        </p>
      </header>

      <section className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-4">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          M12 simulation scripts inject failures for practice. M13 runbooks document the
          operator response. Use the Incidents page to understand scenario context, then
          open the matching runbook for the operational procedure.
        </p>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Runbook catalog"
          description="Three M13 operational runbooks validated on the local kind cluster."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {runbookDocuments.map((runbook) => {
            const Icon = runbook.icon;
            return (
              <Card key={runbook.id} className="flex h-full flex-col bg-card/60">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <Badge variant="muted" className="shrink-0 text-[10px] uppercase">
                      M13
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{runbook.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      {runbook.summary}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-3 border-t border-border pt-4">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {runbook.sourceDoc}
                  </p>
                  <Button asChild className="w-full">
                    <Link to={`/reliability/runbooks?runbook=${runbook.id}`}>
                      Open runbook
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

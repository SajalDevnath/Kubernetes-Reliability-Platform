import { CornerDownRight, Database, Server } from "lucide-react";

import type { ServiceDependency } from "@/lib/services-catalog";
import { cn } from "@/lib/utils";

interface DependencyTreeProps {
  serviceName: string;
  dependencies: ServiceDependency[];
  className?: string;
}

function DependencyIcon({ kind }: { kind: ServiceDependency["kind"] }) {
  if (kind === "database") {
    return <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />;
  }
  return <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

export function DependencyTree({
  serviceName,
  dependencies,
  className,
}: DependencyTreeProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/20 px-3 py-3 font-mono text-xs",
        className,
      )}
      aria-label={`${serviceName} dependencies`}
    >
      <p className="font-medium text-foreground">{serviceName}</p>
      <div className="mt-2 space-y-1.5 border-l border-border/80 pl-3">
        {dependencies.map((dependency) => (
          <div key={dependency.name} className="flex items-center gap-2 text-muted-foreground">
            <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
            <DependencyIcon kind={dependency.kind} />
            <span>{dependency.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

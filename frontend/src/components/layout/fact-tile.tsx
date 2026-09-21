import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface FactTileProps {
  label: string;
  value: string;
  detail: string;
  icon?: LucideIcon;
  className?: string;
}

export function FactTile({ label, value, detail, icon: Icon, className }: FactTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/60 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlaceholderStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export function PlaceholderState({
  icon: Icon,
  title,
  description,
  badge,
  className,
}: PlaceholderStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      {badge ? (
        <Badge variant="muted" className="mb-3">
          {badge}
        </Badge>
      ) : null}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

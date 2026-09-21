import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SloTargetCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function SloTargetCard({
  icon: Icon,
  value,
  label,
  description,
  className,
  children,
}: SloTargetCardProps) {
  return (
    <Card className={cn("bg-card/60", className)}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <Badge variant="muted" className="shrink-0 text-[10px] uppercase">
            Configured target
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
        </div>
      </CardHeader>
      {children ? <CardContent className="pt-0">{children}</CardContent> : null}
    </Card>
  );
}

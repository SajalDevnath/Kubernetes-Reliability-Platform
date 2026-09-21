import { ArrowRight, BarChart3, ScrollText, Workflow } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DependencyTree } from "@/components/reliability/dependency-tree";
import type { ServiceDefinition } from "@/lib/services-catalog";
import { observabilityLinks } from "@/lib/services-catalog";

const observabilityIcons = {
  Metrics: BarChart3,
  Logs: ScrollText,
  Traces: Workflow,
} as const;

interface ServiceCardProps {
  service: ServiceDefinition;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const Icon = service.icon;

  return (
    <Card className="flex h-full flex-col bg-card/60">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">{service.name}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {service.purpose}
              </CardDescription>
            </div>
          </div>
          <Badge variant="muted" className="shrink-0 text-[10px] uppercase">
            Documented
          </Badge>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Port
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">{service.port}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {service.healthLabel}
            </p>
            <p className="mt-1 font-mono text-xs leading-relaxed text-foreground">
              {service.healthDetail}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dependencies
          </p>
          <DependencyTree
            serviceName={service.name}
            dependencies={service.dependencies}
          />
        </div>

        {service.notes && service.notes.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Behavior
            </p>
            <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              {service.notes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span className="text-muted-foreground/50" aria-hidden="true">·</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Investigate
          </p>
          <div className="flex flex-wrap gap-2">
            {observabilityLinks.map((link) => {
              const LinkIcon = observabilityIcons[link.label];
              return (
                <Button
                  key={link.href}
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  <Link to={link.href}>
                    <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </div>
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link to={service.appHref}>
              Open {service.name} console
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

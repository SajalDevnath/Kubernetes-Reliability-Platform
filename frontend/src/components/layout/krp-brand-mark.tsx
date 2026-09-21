import { Network, Shield } from "lucide-react";

import { cn } from "@/lib/utils";

interface KrpBrandMarkProps {
  className?: string;
}

export function KrpBrandMark({ className }: KrpBrandMarkProps) {
  return (
    <div
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card",
        className,
      )}
      aria-hidden="true"
    >
      <Shield className="h-4 w-4 text-foreground" strokeWidth={2} />
      <Network
        className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-primary"
        strokeWidth={2.5}
      />
    </div>
  );
}

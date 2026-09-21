import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-8", className)}>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {description}
          </p>
        ) : null}
      </header>
      <div className="space-y-8">{children}</div>
    </div>
  );
}

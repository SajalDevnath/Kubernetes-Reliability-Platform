import { Github } from "lucide-react";

import { KrpBrandMark } from "@/components/layout/krp-brand-mark";
import { NavItem } from "@/components/layout/nav-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { navigationSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar",
        className,
      )}
      aria-label="Main navigation"
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <KrpBrandMark />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">KRP</p>
          <p className="truncate text-xs text-muted-foreground">Reliability Console</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {navigationSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavItem item={item} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="shrink-0 p-4 pt-2">
        <a
          href="https://github.com/SajalDevnath/Kubernetes-Reliability-Platform"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Github className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>GitHub repository</span>
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          Kubernetes Reliability Platform
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
          M0–M13 complete · Frontend M14
        </p>
      </div>
    </aside>
  );
}

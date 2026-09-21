import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { routeMeta } from "@/lib/navigation";

interface HeaderProps {
  mobileNavOpen: boolean;
  onMobileNavOpenChange: (open: boolean) => void;
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") {
    return "Overview";
  }
  return routeMeta[pathname]?.title ?? "KRP";
}

export function Header({ mobileNavOpen, onMobileNavOpenChange }: HeaderProps) {
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="z-40 flex h-14 shrink-0 items-center gap-4 bg-background px-4 md:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={onMobileNavOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <Sidebar onNavigate={() => onMobileNavOpenChange(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{pageTitle}</p>
        <p className="truncate text-xs text-muted-foreground">
          SRE operations console
        </p>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <span className="rounded border border-border/50 bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/80">
          local
        </span>
      </div>
    </header>
  );
}

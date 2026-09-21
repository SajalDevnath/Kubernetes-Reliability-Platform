import { NavLink } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import type { NavItem as NavItemType } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface NavItemProps {
  item: NavItemType;
  onNavigate?: () => void;
}

export function NavItem({ item, onNavigate }: NavItemProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      end={item.href === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <span className="truncate">{item.title}</span>
      {item.badge ? (
        <Badge variant="muted" className="ml-auto text-[10px] uppercase tracking-wide">
          {item.badge}
        </Badge>
      ) : null}
    </NavLink>
  );
}

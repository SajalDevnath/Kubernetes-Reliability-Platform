import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";

import { PageContainer } from "@/components/layout/page-container";
import { PlaceholderState } from "@/components/layout/placeholder-state";
import { routeMeta } from "@/lib/navigation";

export function PlaceholderPage() {
  const { pathname } = useLocation();
  const meta = routeMeta[pathname];

  if (!meta) {
    return (
      <PageContainer title="Page not found" description="The requested route is not defined.">
        <PlaceholderState
          icon={Construction}
          title="Unknown route"
          description="This path is not part of the planned KRP information architecture."
        />
      </PageContainer>
    );
  }

  const isAssistant = pathname === "/assistant";
  const milestoneLabel = meta.milestone ?? "M14";

  return (
    <PageContainer title={meta.title} description={meta.description}>
      <PlaceholderState
        icon={Construction}
        badge={`Planned · ${milestoneLabel}`}
        title={isAssistant ? "Runbook Assistant coming in M15" : "Section not implemented yet"}
        description={
          isAssistant
            ? "The Runbook Knowledge Assistant will provide grounded guidance from KRP runbooks and operational documentation. This foundation piece only reserves the route and navigation entry."
            : `The ${meta.title} section will be implemented in a later frontend piece. Navigation and routing are in place so the application shell can evolve without restructuring.`
        }
      />
    </PageContainer>
  );
}

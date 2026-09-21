import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { OverviewPage } from "@/pages/overview";
import { PlaceholderPage } from "@/pages/placeholder-page";
import { OrdersPage } from "@/pages/orders";
import { PaymentsPage } from "@/pages/payments";
import { RunbooksPage } from "@/pages/runbooks";
import { IncidentsPage } from "@/pages/incidents";
import { ServicesPage } from "@/pages/services";
import { LogsPage } from "@/pages/logs";
import { MetricsPage } from "@/pages/metrics";
import { AlertsPage } from "@/pages/alerts";
import { TracesPage } from "@/pages/traces";
import { SloPage } from "@/pages/slo";
import { UsersPage } from "@/pages/users";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "reliability/services", element: <ServicesPage /> },
      { path: "reliability/slo", element: <SloPage /> },
      { path: "reliability/incidents", element: <IncidentsPage /> },
      { path: "reliability/runbooks", element: <RunbooksPage /> },
      { path: "observability/metrics", element: <MetricsPage /> },
      { path: "observability/logs", element: <LogsPage /> },
      { path: "observability/traces", element: <TracesPage /> },
      { path: "observability/alerts", element: <AlertsPage /> },
      { path: "assistant", element: <PlaceholderPage /> },
    ],
  },
]);

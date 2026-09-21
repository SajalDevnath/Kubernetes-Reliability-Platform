import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="hidden md:flex" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          mobileNavOpen={mobileNavOpen}
          onMobileNavOpenChange={setMobileNavOpen}
        />
        <main
          id="main-scroll-container"
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6 md:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

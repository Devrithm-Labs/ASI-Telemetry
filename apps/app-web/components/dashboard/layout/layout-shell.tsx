"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardSidebar } from "./sidebar";
import { DashboardHeader } from "./header";
import { TraceModal } from "../modals/trace-modal";
import { AlertModal } from "../modals/alert-modal";
import { NewDashboardModal } from "../modals/new-dashboard-modal";
import { DashboardProvider, useDashboard } from "../context/dashboard-context";
import { getAuthToken } from "@/lib/auth";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/signup";
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  const {
    activeHeaderTab,
    setActiveHeaderTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    selectedTrace,
    setSelectedTrace,
    isAlertModalOpen,
    setIsAlertModalOpen,
    isDashboardModalOpen,
    setIsDashboardModalOpen,
  } = useDashboard();

  React.useEffect(() => {
    if (isPublicRoute) {
      setIsAuthenticated(true);
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setIsAuthenticated(false);
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    } else {
      setIsAuthenticated(true);
    }
  }, [isPublicRoute, pathname, router]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">Verifying authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans selection:bg-foreground selection:text-background">
      {/* Persistent Sidebar Navigation */}
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Persistent Top Header */}
        <DashboardHeader
          activeTab={activeHeaderTab}
          onTabChange={(tab) => setActiveHeaderTab(tab)}
          onOpenAlertModal={() => setIsAlertModalOpen(true)}
          onOpenDashboardModal={() => setIsDashboardModalOpen(true)}
        />

        {/* Page Specific Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      {/* Global Modals */}
      <TraceModal
        trace={selectedTrace}
        open={!!selectedTrace}
        onClose={() => setSelectedTrace(null)}
      />

      <AlertModal
        open={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
      />

      <NewDashboardModal
        open={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
      />
    </div>
  );
}

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </DashboardProvider>
  );
}

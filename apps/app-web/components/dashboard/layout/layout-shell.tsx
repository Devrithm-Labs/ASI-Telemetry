"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { DashboardSidebar } from "./sidebar";
import { DashboardHeader } from "./header";
import { TraceModal } from "../modals/trace-modal";
import { AlertModal } from "../modals/alert-modal";
import { NewDashboardModal } from "../modals/new-dashboard-modal";
import { DashboardProvider, useDashboard } from "../context/dashboard-context";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/signup";
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

  if (isPublicRoute) {
    return <>{children}</>;
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

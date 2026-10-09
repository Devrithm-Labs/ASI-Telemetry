"use client";

import * as React from "react";
import { DashboardSidebar } from "./sidebar";
import { DashboardHeader } from "./header";
import { TraceModal } from "../modals/trace-modal";
import { AlertModal } from "../modals/alert-modal";
import { NewDashboardModal } from "../modals/new-dashboard-modal";
import { DashboardProvider, useDashboard } from "../context/dashboard-context";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-slate-100 font-sans selection:bg-blue-600/30 selection:text-blue-200">
      {/* Persistent Sidebar Navigation */}
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 flex-col overflow-hidden bg-black">
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

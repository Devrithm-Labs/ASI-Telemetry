"use client";

import * as React from "react";

interface DashboardHeaderProps {
  activeTab: "Monitoring" | "Dashboards" | "Alerts";
  onTabChange: (tab: "Monitoring" | "Dashboards" | "Alerts") => void;
  onOpenAlertModal: () => void;
  onOpenDashboardModal: () => void;
}

export function DashboardHeader({
  activeTab,
  onTabChange,
  onOpenAlertModal,
  onOpenDashboardModal,
}: DashboardHeaderProps) {
  const tabs = ["Monitoring", "Dashboards", "Alerts"] as const;

  return (
    <header className="border-b border-[#1e293b] bg-black px-6 py-3">
      {/* Breadcrumbs & Organization */}
      <h1 className="font-bold text-lg text-white">ASI:Telemetry | Observebility & Monitoring Platform</h1>
    </header>
  );
}

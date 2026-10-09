"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useDashboard } from "../context/dashboard-context";

interface DashboardHeaderProps {
  activeTab?: "Monitoring" | "Dashboards" | "Alerts";
  onTabChange?: (tab: "Monitoring" | "Dashboards" | "Alerts") => void;
  onOpenAlertModal?: () => void;
  onOpenDashboardModal?: () => void;
}

export function DashboardHeader({
  activeTab,
  onTabChange,
  onOpenAlertModal,
  onOpenDashboardModal,
}: DashboardHeaderProps) {
  const { isLive, setIsLive, isRefreshing, handleRefresh, lastUpdated } = useDashboard();

  return (
    <header className="border-b border-[#1e293b] bg-black px-6 py-2.5 flex items-center justify-between">
      {/* Platform Title */}
      <div className="flex items-center gap-2.5">
        <h1 className="font-bold text-base text-white tracking-tight">ASI:Telemetry</h1>
        <span className="text-slate-600 hidden sm:inline">|</span>
        <span className="text-xs text-slate-400 hidden sm:inline">Observability &amp; Monitoring Platform</span>
      </div>

      {/* Global Controls: Last updated, Live toggle, and Refresh button */}
      <div className="flex items-center gap-2.5">
        {lastUpdated && (
          <span className="text-[11px] text-slate-500 hidden md:inline">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}

        {/* Live toggle */}
        <button
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            isLive
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40"
              : "border-slate-800 bg-[#0a0a0a] text-slate-400 hover:text-slate-300"
          }`}
          title={isLive ? "Live polling active (every 3s) — click to pause" : "Polling paused — click to resume"}
        >
          <span className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
          <span>{isLive ? "Live" : "Paused"}</span>
        </button>

        {/* Manual Refresh Button */}
        <button
          onClick={() => handleRefresh()}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-md border border-[#1e293b] bg-[#0c0c0c] px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-blue-500/60 hover:text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          title="Refresh Telemetry Data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-400" : "text-slate-400"}`} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
    </header>
  );
}

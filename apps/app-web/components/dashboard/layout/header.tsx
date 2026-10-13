"use client";

import * as React from "react";
import { useDashboard } from "../context/dashboard-context";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const { isLive, setIsLive, lastUpdated } = useDashboard();

  return (
    <header className="border-b border-slate-200 dark:border-[#1e293b] bg-white/95 dark:bg-black/95 backdrop-blur-md px-6 py-2.5 flex items-center justify-between transition-colors">
      {/* Platform Title & Subtitle */}
      <div className="flex items-center gap-2.5">
        <h1 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">ASI:Telemetry</h1>
        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
          Observability &amp; Monitoring Platform
        </span>
      </div>

      {/* Global Controls: Last updated, Live stream toggle, and Theme Switcher */}
      <div className="flex items-center gap-2.5">
        {lastUpdated && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden md:inline">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}

        {/* Live / Static indicator */}
        <button
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors select-none ${
            isLive
              ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-500/30 dark:text-emerald-400"
              : "border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#0c0c0c] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
          title={isLive ? "Live telemetry stream active" : "Static mode"}
        >
          <span className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          <span className="font-medium text-[11px]">{isLive ? "Live" : "Static"}</span>
        </button>

        {/* Light & Dark Mode Switch */}
        <ThemeToggle />
      </div>
    </header>
  );
}

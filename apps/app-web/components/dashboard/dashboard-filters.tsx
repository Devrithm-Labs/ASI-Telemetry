"use client";

import * as React from "react";
import {
  Calendar,
  ChevronDown,
  Layers,
  Monitor,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import { TimeRange } from "./dashboard-types";

export interface SubTabItem {
  id: string;
  label: string;
  targetId?: string;
  badge?: string;
}

interface DashboardFiltersProps {
  selectedProject?: string;
  onProjectChange?: (proj: string) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  subTabs?: SubTabItem[];
  activeSubTab?: string;
  onSubTabChange?: (tabId: string) => void;
  isLive?: boolean;
  onToggleLive?: () => void;
  onRefresh?: () => void;
  routeCategory?: string;
  routeTitle?: string;
  routeIcon?: React.ComponentType<{ className?: string }>;
  extraControls?: React.ReactNode;
  showTimeRange?: boolean;
  showProjectSelector?: boolean;
  showLiveToggle?: boolean;
}

export function DashboardFilters({
  selectedProject = "devrithm",
  onProjectChange,
  timeRange = "7d",
  onTimeRangeChange,
  subTabs,
  activeSubTab,
  onSubTabChange,
  isLive,
  onToggleLive,
  onRefresh,
  routeCategory = "Observability",
  routeTitle = "Monitoring",
  routeIcon: RouteIcon = Monitor,
  extraControls,
  showTimeRange = true,
  showProjectSelector = true,
  showLiveToggle = false,
}: DashboardFiltersProps) {
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [isTimeOpen, setIsTimeOpen] = React.useState(false);

  const projects = [
    "devrithm",
    "agent-runtime-core",
    "asi-llm-gateway",
    "vector-search-svc",
    "all-applications",
  ];

  const timeRangeLabels: Record<TimeRange, string> = {
    "1h": "Last 1 hour",
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  return (
    <div className="border-b border-[#1e293b] bg-black px-6 py-2.5 space-y-2.5">
      {/* Top Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Distinct Route Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <RouteIcon className="h-4 w-4 text-blue-400 shrink-0" />
            <span className="text-slate-400">{routeCategory}</span>
            <span className="text-slate-600">/</span>
            <span className="text-blue-300 font-semibold">{routeTitle}</span>
          </div>

          {/* Project Selector Dropdown */}
          {showProjectSelector && onProjectChange && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsProjectOpen(!isProjectOpen);
                  setIsTimeOpen(false);
                }}
                className="flex h-7.5 items-center gap-1.5 rounded-md border border-[#1e293b] bg-black px-2.5 text-xs font-semibold text-slate-200 hover:border-blue-500/60 hover:text-white transition-colors"
              >
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                <span>{selectedProject}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isProjectOpen && (
                <div className="absolute left-0 top-9 z-50 w-48 rounded-md border border-[#1e293b] bg-[#090d16] py-1 shadow-2xl backdrop-blur-md">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-400">
                    Select Application
                  </div>
                  {projects.map((proj) => (
                    <button
                      key={proj}
                      onClick={() => {
                        onProjectChange(proj);
                        setIsProjectOpen(false);
                      }}
                      className={`flex w-full items-center px-2.5 py-1.5 text-xs transition-colors ${
                        selectedProject === proj
                          ? "bg-blue-600/20 text-blue-300 font-semibold"
                          : "text-slate-300 hover:bg-[#141414] hover:text-white"
                      }`}
                    >
                      {proj}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Time Range Selector */}
          {showTimeRange && onTimeRangeChange && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsTimeOpen(!isTimeOpen);
                  setIsProjectOpen(false);
                }}
                className="flex h-7.5 items-center gap-1.5 rounded-md border border-[#1e293b] bg-black px-2.5 text-xs font-medium text-slate-200 hover:border-blue-500/60 hover:text-white transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                <span>{timeRangeLabels[timeRange]}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isTimeOpen && (
                <div className="absolute left-0 top-9 z-50 w-36 rounded-md border border-[#1e293b] bg-[#090d16] py-1 shadow-2xl backdrop-blur-md">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-400">
                    Time Range
                  </div>
                  {(["1h", "24h", "7d", "30d"] as TimeRange[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        onTimeRangeChange(r);
                        setIsTimeOpen(false);
                      }}
                      className={`flex w-full items-center px-2.5 py-1.5 text-xs transition-colors ${
                        timeRange === r
                          ? "bg-blue-600/20 text-blue-300 font-semibold"
                          : "text-slate-300 hover:bg-[#141414] hover:text-white"
                      }`}
                    >
                      {timeRangeLabels[r]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extra Right Controls */}
        <div className="flex items-center gap-2">
         
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex h-7.5 w-7.5 items-center justify-center rounded-md border border-[#1e293b] bg-black text-slate-400 hover:text-white hover:border-blue-500/60 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Route-Specific Sub-Tabs Bar (rendered only when subTabs are provided) */}
      {subTabs && subTabs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar">
          {subTabs.map((subTab) => {
            const isActive = activeSubTab === subTab.id || activeSubTab === subTab.label;

            return (
              <button
                key={subTab.id}
                onClick={() => {
                  onSubTabChange?.(subTab.id);
                  if (subTab.targetId) {
                    const element = document.getElementById(subTab.targetId);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }
                }}
                className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold"
                    : "text-slate-400 hover:bg-[#141414] hover:text-slate-200"
                }`}
              >
                <span>{subTab.label}</span>
                {subTab.badge && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-blue-950/60 text-blue-300"
                    }`}
                  >
                    {subTab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

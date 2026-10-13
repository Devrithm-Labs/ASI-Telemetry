"use client";

import * as React from "react";
import {
  Calendar,
  ChevronDown,
  Layers,
  Code,
  Gauge,
  LucideIcon,
} from "lucide-react";
import { TimeRange, ApplicationItem } from "../context/dashboard-types";

export interface SubTabItem {
  id: string;
  label: string;
  targetId?: string;
  badge?: string;
}

interface DashboardFiltersProps {
  selectedProject?: string;
  onProjectChange?: (project: string) => void;
  selectedFunction?: string;
  onFunctionChange?: (func: string) => void;
  applications?: ApplicationItem[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  subTabs?: SubTabItem[];
  activeSubTab?: string;
  onSubTabChange?: (tabId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showTimeRange?: boolean;
  showProjectSelector?: boolean;
  showLiveToggle?: boolean;
  routeCategory?: string;
  routeTitle?: string;
  routeIcon?: LucideIcon;
  extraControls?: React.ReactNode;
  hideFilterControls?: boolean;
}

const timeRangeLabels: Record<TimeRange, string> = {
  "1h": "1h",
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
};

export function DashboardFilters({
  selectedProject = "all-applications",
  onProjectChange,
  selectedFunction = "all",
  onFunctionChange,
  applications = [],
  timeRange = "24h",
  onTimeRangeChange,
  subTabs,
  activeSubTab,
  onSubTabChange,
  showTimeRange = true,
  showProjectSelector = true,
  routeCategory = "Observability",
  routeTitle = "Tool Monitoring",
  routeIcon: RouteIcon = Gauge,
  extraControls,
  hideFilterControls = false,
}: DashboardFiltersProps) {
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [isFuncOpen, setIsFuncOpen] = React.useState(false);
  const [isTimeOpen, setIsTimeOpen] = React.useState(false);

  // Derive distinct applications list
  const appList = React.useMemo(() => {
    return applications || [];
  }, [applications]);

  // Derive functions for selected application
  const availableFuncs = React.useMemo(() => {
    if (!selectedProject || selectedProject === "all-applications") {
      const set = new Set<string>();
      appList.forEach((a) => a.functions.forEach((f) => set.add(f)));
      return Array.from(set);
    }
    const app = appList.find((a) => a.agent_name === selectedProject);
    return app?.functions || [];
  }, [selectedProject, appList]);

  if (hideFilterControls) {
    return (
      <div className="border-b border-slate-200 dark:border-[#1e293b] bg-white/95 dark:bg-black/95 px-6 py-2.5 space-y-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Distinct Route Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <RouteIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">{routeCategory}</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-slate-900 dark:text-white font-semibold">{routeTitle}</span>
          </div>

          {/* Route-Specific Sub-Tabs Bar */}
          {subTabs && subTabs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                    className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#141414] hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{subTab.label}</span>
                    {subTab.badge && (
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
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
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 dark:border-[#1e293b] bg-white/95 dark:bg-black/95 px-6 py-2.5 space-y-2.5 backdrop-blur-md">
      {/* Top Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Distinct Route Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <RouteIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">{routeCategory}</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-slate-900 dark:text-white font-semibold">{routeTitle}</span>
          </div>

          {/* Project & Respective Function Selector Dropdown */}
          {showProjectSelector && onProjectChange && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsProjectOpen(!isProjectOpen);
                  setIsFuncOpen(false);
                  setIsTimeOpen(false);
                }}
                className="flex h-7.5 items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0c1017] px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-500/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Select Agent Application"
              >
                <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{selectedProject === "all-applications" ? "All Applications" : selectedProject}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isProjectOpen && (
                <div className="absolute left-0 top-9 z-50 w-72 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#090d16] py-1 shadow-2xl backdrop-blur-md">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1e293b]/70 flex items-center justify-between">
                    <span>Application</span>
                    <span>Respective Func</span>
                  </div>

                  {/* All applications option */}
                  <button
                    onClick={() => {
                      onProjectChange("all-applications");
                      setIsProjectOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors ${
                      selectedProject === "all-applications"
                        ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141414] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>All Applications</span>
                    <span className="font-mono text-[10px] text-slate-400">Fleet wide</span>
                  </button>

                  {/* Individual application rows */}
                  {appList.map((app) => (
                    <button
                      key={app.agent_name}
                      onClick={() => {
                        onProjectChange(app.agent_name);
                        setIsProjectOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors ${
                        selectedProject === app.agent_name
                          ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141414] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="truncate font-medium">{app.agent_name}</span>
                      <div className="flex items-center gap-1 overflow-hidden ml-2 max-w-[130px]">
                        {app.functions.slice(0, 2).map((fn) => (
                          <span
                            key={fn}
                            className="rounded bg-slate-100 dark:bg-[#070a10] border border-slate-200 dark:border-[#1e293b] px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate"
                            title={`Function: ${fn}`}
                          >
                            {fn}
                          </span>
                        ))}
                        {app.functions.length > 2 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            +{app.functions.length - 2}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Respective Function Name Selector Pill */}
          {onFunctionChange && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsFuncOpen(!isFuncOpen);
                  setIsProjectOpen(false);
                  setIsTimeOpen(false);
                }}
                className="flex h-7.5 items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0c1017] px-2.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 hover:border-emerald-500/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Filter by function name"
              >
                <Code className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-slate-400">fn:</span>
                <span className="text-emerald-600 dark:text-emerald-300">
                  {selectedFunction === "all" ? "All Functions" : selectedFunction}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isFuncOpen && (
                <div className="absolute left-0 top-9 z-50 w-56 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#090d16] py-1 shadow-2xl backdrop-blur-md">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1e293b]/70 flex items-center justify-between">
                    <span>Respective Functions</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{selectedProject}</span>
                  </div>

                  <button
                    onClick={() => {
                      onFunctionChange("all");
                      setIsFuncOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-1.5 text-xs font-mono transition-colors ${
                      selectedFunction === "all"
                        ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141414] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    All Functions (Entire Agent)
                  </button>

                  {availableFuncs.map((fn) => (
                    <button
                      key={fn}
                      onClick={() => {
                        onFunctionChange(fn);
                        setIsFuncOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-mono transition-colors ${
                        selectedFunction === fn
                          ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 font-semibold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141414] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="truncate">{fn}</span>
                      <span className="text-[10px] text-slate-400">tracked</span>
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
                  setIsFuncOpen(false);
                }}
                className="flex h-7.5 items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0c1017] px-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-blue-500/60 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{timeRangeLabels[timeRange]}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isTimeOpen && (
                <div className="absolute left-0 top-9 z-50 w-36 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#090d16] py-1 shadow-2xl backdrop-blur-md">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1e293b]/70 mb-1">
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
                          ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141414] hover:text-slate-900 dark:hover:text-white"
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
        {extraControls && (
          <div className="flex items-center gap-2">
            {extraControls}
          </div>
        )}
      </div>

      {/* Route-Specific Sub-Tabs Bar */}
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
                className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#141414] hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span>{subTab.label}</span>
                {subTab.badge && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
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

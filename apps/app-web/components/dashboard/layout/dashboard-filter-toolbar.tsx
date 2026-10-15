"use client";

import * as React from "react";
import {
  Layers,
  Code,
  Calendar,
  ChevronDown,
  Check,
} from "lucide-react";
import { TimeRange, ApplicationItem } from "../context/dashboard-types";

interface DashboardFilterToolbarProps {
  selectedProject?: string;
  onProjectChange?: (project: string) => void;
  selectedFunction?: string;
  onFunctionChange?: (func: string) => void;
  applications?: ApplicationItem[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const timeRangeLabels: Record<TimeRange, string> = {
  "1h": "Last 1 hour",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export function DashboardFilterToolbar({
  selectedProject = "all-applications",
  onProjectChange,
  selectedFunction = "all",
  onFunctionChange,
  applications = [],
  timeRange = "24h",
  onTimeRangeChange,
}: DashboardFilterToolbarProps) {
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [isFuncOpen, setIsFuncOpen] = React.useState(false);
  const [isTimeOpen, setIsTimeOpen] = React.useState(false);

  // Close menus on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-filter-menu]")) {
        setIsProjectOpen(false);
        setIsFuncOpen(false);
        setIsTimeOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Compute available functions for the selected application
  const availableFuncs = React.useMemo(() => {
    if (!selectedProject || selectedProject === "all-applications") {
      const set = new Set<string>();
      applications.forEach((a) => a.functions.forEach((f: string) => set.add(f)));
      return Array.from(set);
    }
    const app = applications.find((a) => a.agent_name === selectedProject);
    return app?.functions || [];
  }, [selectedProject, applications]);

  return (
    <div
      data-filter-menu
      className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white/90 dark:bg-black/80 px-3 py-2 shadow-sm backdrop-blur-md"
    >
      {/* 1. Filter: Application / Agent Selector */}
      {onProjectChange && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsProjectOpen(!isProjectOpen);
              setIsFuncOpen(false);
              setIsTimeOpen(false);
            }}
            className={`group flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-all duration-200 select-none ${
              isProjectOpen
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shadow-sm"
                : "border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#090d16] text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:bg-slate-100 dark:hover:bg-[#0f172a] hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Filter by Application"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Layers className="h-3 w-3" />
            </div>
            <span className="font-semibold">
              {selectedProject === "all-applications"
                ? "All Applications"
                : selectedProject}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                isProjectOpen ? "rotate-180 text-blue-500" : "group-hover:text-slate-600 dark:group-hover:text-slate-200"
              }`}
            />
          </button>

          {isProjectOpen && (
            <div className="absolute left-0 top-9.5 z-50 w-72 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#080c14] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1e293b]/60 mb-1">
                <span>Application Fleet</span>
                <span>Active Traces</span>
              </div>

              {/* All Applications option */}
              <button
                type="button"
                onClick={() => {
                  onProjectChange("all-applications");
                  setIsProjectOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  selectedProject === "all-applications"
                    ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#121927] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>All Applications (Fleet Wide)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">Total fleet</span>
              </button>

              {/* Dynamic Application items */}
              {applications.map((app) => (
                <button
                  key={app.agent_name}
                  type="button"
                  onClick={() => {
                    onProjectChange(app.agent_name);
                    setIsProjectOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    selectedProject === app.agent_name
                      ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#121927] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                    <span className="truncate font-mono font-medium">{app.agent_name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="rounded bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900/50 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-300">
                      {app.functions.length} fn
                    </span>
                    {selectedProject === app.agent_name && (
                      <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ml-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Filter: Function Name Selector */}
      {onFunctionChange && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFuncOpen(!isFuncOpen);
              setIsProjectOpen(false);
              setIsTimeOpen(false);
            }}
            className={`group flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-mono font-medium transition-all duration-200 select-none ${
              isFuncOpen
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200 shadow-sm"
                : "border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#090d16] text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-[#0f172a] hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Filter by Function Name"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <Code className="h-3 w-3" />
            </div>
            <span className="text-slate-500 dark:text-slate-400">fn:</span>
            <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
              {selectedFunction === "all" ? "All Functions" : selectedFunction}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                isFuncOpen ? "rotate-180 text-emerald-500" : "group-hover:text-slate-600 dark:group-hover:text-slate-200"
              }`}
            />
          </button>

          {isFuncOpen && (
            <div className="absolute right-0 sm:left-0 sm:right-auto top-9.5 z-50 w-64 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#080c14] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1e293b]/60 mb-1">
                <span className="flex items-center gap-1.5">
                  <Code className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                  <span>Respective Functions</span>
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{selectedProject}</span>
              </div>

              {/* All Functions option */}
              <button
                type="button"
                onClick={() => {
                  onFunctionChange("all");
                  setIsFuncOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-mono transition-colors ${
                  selectedFunction === "all"
                    ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#121927] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>All Functions (Entire Agent)</span>
                {selectedFunction === "all" && (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>

              {/* Dynamic individual functions */}
              {availableFuncs.map((fn: string) => (
                <button
                  key={fn}
                  type="button"
                  onClick={() => {
                    onFunctionChange(fn);
                    setIsFuncOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-mono transition-colors ${
                    selectedFunction === fn
                      ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#121927] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span className="truncate">{fn}</span>
                  {selectedFunction === fn ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-slate-400">tracked</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Filter: Time Window Selector */}
      {onTimeRangeChange && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsTimeOpen(!isTimeOpen);
              setIsProjectOpen(false);
              setIsFuncOpen(false);
            }}
            className={`group flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-all duration-200 select-none ${
              isTimeOpen
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-white shadow-sm"
                : "border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#090d16] text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:bg-slate-100 dark:hover:bg-[#0f172a] hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Select Time Range"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Calendar className="h-3 w-3" />
            </div>
            <span>{timeRangeLabels[timeRange]}</span>
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                isTimeOpen ? "rotate-180 text-blue-500 dark:text-blue-400" : "group-hover:text-slate-600 dark:group-hover:text-slate-200"
              }`}
            />
          </button>

          {isTimeOpen && (
            <div className="absolute right-0 top-9.5 z-50 w-44 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#080c14] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1e293b]/60 mb-1">
                Time Window
              </div>
              {(["1h", "24h", "7d", "30d"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onTimeRangeChange(r);
                    setIsTimeOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    timeRange === r
                      ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#121927] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{timeRangeLabels[r]}</span>
                  {timeRange === r && (
                    <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

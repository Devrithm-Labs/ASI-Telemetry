"use client";

import * as React from "react";
import {
  Calendar,
  ChevronDown,
  Code,
  Layers,
  RefreshCw,
  Check,
  Sparkles,
} from "lucide-react";
import { TimeRange, ApplicationMetadata } from "../context/dashboard-types";

export interface DashboardFilterToolbarProps {
  selectedProject?: string;
  onProjectChange?: (project: string) => void;
  selectedFunction?: string;
  onFunctionChange?: (func: string) => void;
  applications?: ApplicationMetadata[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function DashboardFilterToolbar({
  selectedProject = "assistant",
  onProjectChange,
  selectedFunction = "all",
  onFunctionChange,
  applications,
  timeRange = "7d",
  onTimeRangeChange,
  onRefresh,
  isRefreshing = false,
  className = "",
}: DashboardFilterToolbarProps) {
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [isFuncOpen, setIsFuncOpen] = React.useState(false);
  const [isTimeOpen, setIsTimeOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsProjectOpen(false);
        setIsFuncOpen(false);
        setIsTimeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const appList = applications || [];

  const availableFuncs = React.useMemo(() => {
    if (selectedProject === "all-applications") {
      const allFn = new Set<string>();
      appList.forEach((a) => a.functions.forEach((fn) => allFn.add(fn)));
      return Array.from(allFn);
    }
    const currentApp = appList.find((a) => a.agent_name === selectedProject);
    return currentApp?.functions || [];
  }, [appList, selectedProject]);

  const timeRangeLabels: Record<TimeRange, string> = {
    "1h": "Last 1 hour",
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {/* 1. Agent Application Selector Dropdown */}
      {onProjectChange && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsProjectOpen(!isProjectOpen);
              setIsFuncOpen(false);
              setIsTimeOpen(false);
            }}
            className={`group flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-all duration-200 select-none ${
              isProjectOpen
                ? "border-blue-500 bg-blue-950/30 text-white shadow-sm shadow-blue-500/20"
                : "border-[#1e293b] bg-[#090d16] text-slate-200 hover:border-blue-500/50 hover:bg-[#0f172a] hover:text-white"
            }`}
            title="Filter by Agent Application"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-blue-900/50 text-blue-400">
              <Layers className="h-3 w-3" />
            </div>
            <span className="font-mono tracking-tight">
              {selectedProject === "all-applications" ? "All Applications" : selectedProject}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                isProjectOpen ? "rotate-180 text-blue-400" : "group-hover:text-slate-200"
              }`}
            />
          </button>

          {isProjectOpen && (
            <div className="absolute right-0 sm:left-0 sm:right-auto top-9.5 z-50 w-72 rounded-xl border border-[#1e293b] bg-[#080c14]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1e293b]/60 mb-1">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-blue-400" />
                  <span>Agent Fleet</span>
                </span>
                <span className="font-mono text-[9px] text-slate-500">{appList.length} Agents</span>
              </div>

              {/* All Applications Option */}
              <button
                type="button"
                onClick={() => {
                  onProjectChange("all-applications");
                  setIsProjectOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  selectedProject === "all-applications"
                    ? "bg-blue-600/20 text-blue-300 font-semibold"
                    : "text-slate-300 hover:bg-[#121927] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  <span>All Applications</span>
                </div>
                {selectedProject === "all-applications" && (
                  <Check className="h-3.5 w-3.5 text-blue-400" />
                )}
              </button>

              {/* Agent List */}
              <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar mt-1">
                {appList.map((app) => (
                  <button
                    key={app.agent_name}
                    type="button"
                    onClick={() => {
                      onProjectChange(app.agent_name);
                      setIsProjectOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      selectedProject === app.agent_name
                        ? "bg-blue-600/20 text-blue-300 font-semibold"
                        : "text-slate-300 hover:bg-[#121927] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <span className="truncate font-mono font-medium">{app.agent_name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="rounded bg-blue-950/70 border border-blue-900/50 px-1.5 py-0.5 font-mono text-[10px] text-blue-300">
                        {app.functions.length} fn
                      </span>
                      {selectedProject === app.agent_name && (
                        <Check className="h-3.5 w-3.5 text-blue-400 ml-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Respective Function Selector Dropdown */}
      {onFunctionChange && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsFuncOpen(!isFuncOpen);
              setIsProjectOpen(false);
              setIsTimeOpen(false);
            }}
            className={`group flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-mono font-medium transition-all duration-200 select-none ${
              isFuncOpen
                ? "border-emerald-500 bg-emerald-950/30 text-emerald-200 shadow-sm shadow-emerald-500/20"
                : "border-[#1e293b] bg-[#090d16] text-slate-200 hover:border-emerald-500/50 hover:bg-[#0f172a] hover:text-white"
            }`}
            title="Filter by Function Name"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-emerald-900/50 text-emerald-400">
              <Code className="h-3 w-3" />
            </div>
            <span className="text-slate-400 font-sans text-[11px]">fn:</span>
            <span className="text-emerald-300">
              {selectedFunction === "all" ? "All Functions" : selectedFunction}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                isFuncOpen ? "rotate-180 text-emerald-400" : "group-hover:text-slate-200"
              }`}
            />
          </button>

          {isFuncOpen && (
            <div className="absolute right-0 sm:left-0 sm:right-auto top-9.5 z-50 w-64 rounded-xl border border-[#1e293b] bg-[#080c14]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1e293b]/60 mb-1">
                <span className="flex items-center gap-1.5">
                  <Code className="h-3 w-3 text-emerald-400" />
                  <span>Respective Functions</span>
                </span>
                <span className="font-mono text-emerald-400 text-[10px]">{selectedProject}</span>
              </div>

              {/* All Functions Option */}
              <button
                type="button"
                onClick={() => {
                  onFunctionChange("all");
                  setIsFuncOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-mono transition-colors ${
                  selectedFunction === "all"
                    ? "bg-emerald-600/20 text-emerald-300 font-semibold"
                    : "text-slate-300 hover:bg-[#121927] hover:text-white"
                }`}
              >
                <span>All Functions (Entire Agent)</span>
                {selectedFunction === "all" && (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </button>

              {/* Functions List */}
              <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar mt-1">
                {availableFuncs.map((fn) => (
                  <button
                    key={fn}
                    type="button"
                    onClick={() => {
                      onFunctionChange(fn);
                      setIsFuncOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-mono transition-colors ${
                      selectedFunction === fn
                        ? "bg-emerald-600/20 text-emerald-300 font-semibold"
                        : "text-slate-300 hover:bg-[#121927] hover:text-white"
                    }`}
                  >
                    <span className="truncate">{fn}</span>
                    {selectedFunction === fn && (
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Time Range Selector Dropdown */}
      {onTimeRangeChange && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsTimeOpen(!isTimeOpen);
              setIsProjectOpen(false);
              setIsFuncOpen(false);
            }}
            className={`group flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-all duration-200 select-none ${
              isTimeOpen
                ? "border-blue-500 bg-blue-950/30 text-white shadow-sm shadow-blue-500/20"
                : "border-[#1e293b] bg-[#090d16] text-slate-200 hover:border-blue-500/50 hover:bg-[#0f172a] hover:text-white"
            }`}
            title="Select Time Range"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-blue-900/50 text-blue-400">
              <Calendar className="h-3 w-3" />
            </div>
            <span>{timeRangeLabels[timeRange]}</span>
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                isTimeOpen ? "rotate-180 text-blue-400" : "group-hover:text-slate-200"
              }`}
            />
          </button>

          {isTimeOpen && (
            <div className="absolute right-0 top-9.5 z-50 w-44 rounded-xl border border-[#1e293b] bg-[#080c14]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1e293b]/60 mb-1">
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
                      ? "bg-blue-600/20 text-blue-300 font-semibold"
                      : "text-slate-300 hover:bg-[#121927] hover:text-white"
                  }`}
                >
                  <span>{timeRangeLabels[r]}</span>
                  {timeRange === r && (
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Action: Refresh Button */}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#090d16] px-3 text-xs font-medium text-slate-200 hover:border-blue-500/50 hover:bg-[#0f172a] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none"
          title="Refresh Telemetry Metrics"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              isRefreshing ? "animate-spin text-blue-400" : "text-slate-400"
            }`}
          />
          <span className="hidden sm:inline font-medium">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </span>
        </button>
      )}
    </div>
  );
}

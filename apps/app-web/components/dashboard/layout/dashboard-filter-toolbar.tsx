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
import { cn } from "@/lib/utils";

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
      className="relative z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-1.5 shadow-xs"
    >
      {/* 1. Filter: Application / Agent Selector */}
      {onProjectChange && (
        <div className={`relative ${isProjectOpen ? "z-50" : ""}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsProjectOpen(!isProjectOpen);
              setIsFuncOpen(false);
              setIsTimeOpen(false);
            }}
            className={cn(
              "group flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors select-none cursor-pointer",
              isProjectOpen
                ? "border-border bg-accent text-accent-foreground"
                : "border-input bg-background text-foreground hover:bg-muted"
            )}
            title="Filter by Application"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-muted text-foreground">
              <Layers className="h-3 w-3" />
            </div>
            <span className="font-semibold">
              {selectedProject === "all-applications"
                ? "All Agents"
                : selectedProject}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform duration-200",
                isProjectOpen && "rotate-180 text-foreground"
              )}
            />
          </button>

          {isProjectOpen && (
            <div className="absolute left-0 top-9.5 z-50 w-72 rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground">
              {/* All Applications option */}
              <button
                type="button"
                onClick={() => {
                  onProjectChange("all-applications");
                  setIsProjectOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                  selectedProject === "all-applications"
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  <span>All Agents</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">Total {applications.length}</span>
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
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                    selectedProject === app.agent_name
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <span className="truncate font-mono font-medium">{app.agent_name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="rounded bg-muted border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {app.functions.length} fn
                    </span>
                    {selectedProject === app.agent_name && (
                      <Check className="h-3.5 w-3.5 text-foreground ml-1" />
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
        <div className={`relative ${isFuncOpen ? "z-50" : ""}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFuncOpen(!isFuncOpen);
              setIsProjectOpen(false);
              setIsTimeOpen(false);
            }}
            className={cn(
              "group flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-mono font-medium transition-colors select-none cursor-pointer",
              isFuncOpen
                ? "border-border bg-accent text-accent-foreground"
                : "border-input bg-background text-foreground hover:bg-muted"
            )}
            title="Filter by Function Name"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-muted text-foreground">
              <Code className="h-3 w-3" />
            </div>
            
            <span className="font-semibold text-foreground">
              {selectedFunction === "all" ? "All Functions" : selectedFunction}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform duration-200",
                isFuncOpen && "rotate-180 text-foreground"
              )}
            />
          </button>

          {isFuncOpen && (
            <div className="absolute right-0 sm:left-0 sm:right-auto top-9.5 z-50 w-64 rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground">
              {/* All Functions option */}
              <button
                type="button"
                onClick={() => {
                  onFunctionChange("all");
                  setIsFuncOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer",
                  selectedFunction === "all"
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <span>All Functions</span>
                {selectedFunction === "all" && (
                  <Check className="h-3.5 w-3.5 text-foreground" />
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
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer",
                    selectedFunction === fn
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className="truncate">{fn}</span>
                  {selectedFunction === fn ? (
                    <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">tracked</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Filter: Time Window Selector */}
      {onTimeRangeChange && (
        <div className={`relative ${isTimeOpen ? "z-50" : ""}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsTimeOpen(!isTimeOpen);
              setIsProjectOpen(false);
              setIsFuncOpen(false);
            }}
            className={cn(
              "group flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors select-none cursor-pointer",
              isTimeOpen
                ? "border-border bg-accent text-accent-foreground"
                : "border-input bg-background text-foreground hover:bg-muted"
            )}
            title="Select Time Range"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-muted text-foreground">
              <Calendar className="h-3 w-3" />
            </div>
            <span>{timeRangeLabels[timeRange]}</span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform duration-200",
                isTimeOpen && "rotate-180 text-foreground"
              )}
            />
          </button>

          {isTimeOpen && (
            <div className="absolute right-0 top-9.5 z-50 w-44 rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
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
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                    timeRange === r
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span>{timeRangeLabels[r]}</span>
                  {timeRange === r && (
                    <Check className="h-3.5 w-3.5 text-foreground" />
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

"use client";

import * as React from "react";
import {
  Calendar,
  ChevronDown,
  Layers,
  Code,
  Gauge,
  LucideIcon,
  Check,
} from "lucide-react";
import { TimeRange, ApplicationItem } from "../context/dashboard-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  isLive?: boolean;
  onToggleLive?: () => void;
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

  // Close menus on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-filters-wrapper]")) {
        setIsProjectOpen(false);
        setIsFuncOpen(false);
        setIsTimeOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Derive distinct applications list
  const appList = React.useMemo(() => {
    return applications || [];
  }, [applications]);

  // Derive functions for selected application
  const availableFuncs = React.useMemo(() => {
    if (!selectedProject || selectedProject === "all-applications") {
      const set = new Set<string>();
      appList.forEach((a) => a.functions.forEach((f: string) => set.add(f)));
      return Array.from(set);
    }
    const app = appList.find((a) => a.agent_name === selectedProject);
    return app?.functions || [];
  }, [selectedProject, appList]);

  if (hideFilterControls) {
    return (
      <div data-filters-wrapper className="border-b border-border bg-background/95 px-6 py-2.5 space-y-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Route Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <RouteIcon className="h-4 w-4 text-foreground shrink-0" />
            <span className="text-muted-foreground">{routeCategory}</span>
            <span className="text-border">/</span>
            <span className="text-foreground font-semibold">{routeTitle}</span>
          </div>

          {/* Route-Specific Sub-Tabs Bar */}
          {subTabs && subTabs.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                    className={cn(
                      "whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 select-none",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>{subTab.label}</span>
                    {subTab.badge && (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.2 text-[10px] font-mono",
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "border border-border/70 bg-muted text-muted-foreground"
                        )}
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
    <div data-filters-wrapper className="border-b border-border bg-background/95 px-6 py-2.5 space-y-2.5 backdrop-blur-md">
      {/* Top Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Route Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <RouteIcon className="h-4 w-4 text-foreground shrink-0" />
            <span className="text-muted-foreground">{routeCategory}</span>
            <span className="text-border">/</span>
            <span className="text-foreground font-semibold">{routeTitle}</span>
          </div>

          {/* Project & Respective Function Selector Dropdown */}
          {showProjectSelector && onProjectChange && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsProjectOpen(!isProjectOpen);
                  setIsFuncOpen(false);
                  setIsTimeOpen(false);
                }}
                className="h-8 gap-1.5 text-xs font-medium"
                title="Select Agent Application"
              >
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{selectedProject === "all-applications" ? "All Applications" : selectedProject}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>

              {isProjectOpen && (
                <div className="absolute left-0 top-9.5 z-50 w-72 rounded-md border border-border bg-popover p-1 shadow-md backdrop-blur-md text-popover-foreground">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center justify-between">
                    <span>Application</span>
                    <span>Respective Func</span>
                  </div>

                  {/* All applications option */}
                  <button
                    onClick={() => {
                      onProjectChange("all-applications");
                      setIsProjectOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-xs transition-colors cursor-pointer",
                      selectedProject === "all-applications"
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span>All Applications</span>
                    <span className="font-mono text-[10px] text-muted-foreground">Fleet wide</span>
                  </button>

                  {/* Individual application rows */}
                  {appList.map((app) => (
                    <button
                      key={app.agent_name}
                      onClick={() => {
                        onProjectChange(app.agent_name);
                        setIsProjectOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-xs transition-colors cursor-pointer",
                        selectedProject === app.agent_name
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="truncate font-medium">{app.agent_name}</span>
                      <div className="flex items-center gap-1 overflow-hidden ml-2 max-w-[130px]">
                        {app.functions.slice(0, 2).map((fn: string) => (
                          <span
                            key={fn}
                            className="rounded bg-muted border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground truncate"
                            title={`Function: ${fn}`}
                          >
                            {fn}
                          </span>
                        ))}
                        {app.functions.length > 2 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsFuncOpen(!isFuncOpen);
                  setIsProjectOpen(false);
                  setIsTimeOpen(false);
                }}
                className="h-8 gap-1.5 font-mono text-xs font-medium"
                title="Filter by function name"
              >
                <Code className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">fn:</span>
                <span className="text-foreground">
                  {selectedFunction === "all" ? "All Functions" : selectedFunction}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>

              {isFuncOpen && (
                <div className="absolute left-0 top-9.5 z-50 w-56 rounded-md border border-border bg-popover p-1 shadow-md backdrop-blur-md text-popover-foreground">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center justify-between">
                    <span>Respective Functions</span>
                    <span className="font-mono text-foreground">{selectedProject}</span>
                  </div>

                  <button
                    onClick={() => {
                      onFunctionChange("all");
                      setIsFuncOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-sm px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer",
                      selectedFunction === "all"
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    All Functions (Entire Agent)
                  </button>

                  {availableFuncs.map((fn: string) => (
                    <button
                      key={fn}
                      onClick={() => {
                        onFunctionChange(fn);
                        setIsFuncOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer",
                        selectedFunction === fn
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="truncate">{fn}</span>
                      <span className="text-[10px] text-muted-foreground">tracked</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Time Range Selector */}
          {showTimeRange && onTimeRangeChange && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsTimeOpen(!isTimeOpen);
                  setIsProjectOpen(false);
                  setIsFuncOpen(false);
                }}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{timeRangeLabels[timeRange]}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>

              {isTimeOpen && (
                <div className="absolute left-0 top-9.5 z-50 w-36 rounded-md border border-border bg-popover p-1 shadow-md backdrop-blur-md text-popover-foreground">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                    Time Range
                  </div>
                  {(["1h", "24h", "7d", "30d"] as TimeRange[]).map((r) => (
                    <button
                      key={r}
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
                      {timeRange === r && <Check className="h-3.5 w-3.5 text-foreground" />}
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
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar">
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
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 select-none",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{subTab.label}</span>
                {subTab.badge && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[10px] font-mono",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "border border-border/70 bg-muted text-muted-foreground"
                    )}
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

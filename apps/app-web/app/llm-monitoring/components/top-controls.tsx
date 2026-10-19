"use client";

import * as React from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Hourglass,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MonitoringTab, TabMeta, TimeRange } from "../types";

export const MONITORING_TABS: TabMeta[] = [
  { id: "traces", label: "Traces" },
  { id: "llm-calls", label: "LLM Calls" },
  { id: "cost-tokens", label: "Cost & Tokens" },
  { id: "tools", label: "Tools" },
];

export const TIME_RANGE_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: "1h", label: "Last 1 hour" },
  { id: "24h", label: "Last 1 day" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

interface TopControlsProps {
  activeTab: MonitoringTab;
  onTabChange: (tab: MonitoringTab) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
  totalTracesCount: number;
  onRefresh: () => void;
  loading: boolean;
}

export function TopControls({
  activeTab,
  onTabChange,
  timeRange,
  onTimeRangeChange,
  selectedModel,
  onModelChange,
  models,
  totalTracesCount,
  onRefresh,
  loading,
}: TopControlsProps) {
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = React.useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = React.useState(false);

  const currentTimeLabel =
    TIME_RANGE_OPTIONS.find((opt) => opt.id === timeRange)?.label || "Last 7 days";

  // Close menus on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-top-controls-menu]")) {
        setIsTimeDropdownOpen(false);
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  return (
    <div
      data-top-controls-menu
      className="sticky top-0 z-30 flex flex-col border-b border-border bg-background/95 backdrop-blur-md px-6 pt-3 pb-2.5 gap-2.5"
    >
      {/* Top Row: Time Range, Model filter and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Time Range Filter */}
        <div className="flex items-center gap-2">
          {/* Time Range Filter Dropdown (1h, 24h, 7d, 30d, all) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsTimeDropdownOpen(!isTimeDropdownOpen);
                setIsModelDropdownOpen(false);
              }}
              className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer select-none"
              title="Filter by time range"
            >
              <Hourglass className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{currentTimeLabel}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform duration-150",
                  isTimeDropdownOpen && "rotate-180 text-foreground"
                )}
              />
            </button>

            {isTimeDropdownOpen && (
              <div className="absolute left-0 top-9.5 z-50 w-48 rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                  Select Time Range
                </div>
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onTimeRangeChange(opt.id);
                      setIsTimeDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                      timeRange === opt.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{opt.label}</span>
                    {timeRange === opt.id && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Model filter & Refresh */}
        <div className="flex items-center gap-2">
          {/* Model Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsModelDropdownOpen(!isModelDropdownOpen);
                setIsTimeDropdownOpen(false);
              }}
              className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="max-w-[120px] truncate">{selectedModel}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute right-0 top-9.5 z-50 w-48 rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                  Filter Model
                </div>
                {models.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      onModelChange(m);
                      setIsModelDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                      selectedModel === m
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{m}</span>
                    {selectedModel === m && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh database traces"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-foreground")} />
          </button>
        </div>
      </div>

      {/* Second Row: Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {MONITORING_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all select-none cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              {tab.id === "traces" && totalTracesCount > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 text-[10px] font-mono",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "border border-border/70 bg-muted text-muted-foreground"
                )}>
                  {totalTracesCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

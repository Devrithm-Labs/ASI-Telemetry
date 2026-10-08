"use client";

import * as React from "react";
import {
  Calendar,
  ChevronDown,
  Home,
  Layers,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { TimeRange } from "./dashboard-types";
import { Button } from "@/components/ui/button";

interface DashboardFiltersProps {
  selectedProject: string;
  onProjectChange: (proj: string) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
  isLive: boolean;
  onToggleLive: () => void;
  onRefresh: () => void;
  activeNav?: string;
}

export function DashboardFilters({
  selectedProject,
  onProjectChange,
  timeRange,
  onTimeRangeChange,
  activeSubTab,
  onSubTabChange,
  isLive,
  onToggleLive,
  onRefresh,
  activeNav = "Tool Monitoring",
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

  const subTabs = [
    "Request",
    "Latency",
    "Error",
    "CPU",
  ];

  return (
    <div className="border-b border-[#1e293b] bg-black px-6 py-3 space-y-3">
      {/* Top Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Section Breadcrumb */}
          {activeNav === "Home" ? (
            <div className="flex items-center gap-1.5 text-xs">
              <Home className="h-4 w-4 text-blue-400" />
              <span className="text-slate-400">Application</span>
              <span className="text-slate-600">/</span>
              <span className="text-blue-300 font-semibold">Home (SDK Setup)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <Monitor className="h-4 w-4 text-blue-400" />
              <span className="text-slate-300 font-medium">Monitoring</span>
            </div>
          )}
          <div className="relative">
            <button
              onClick={() => {
                setIsProjectOpen(!isProjectOpen);
                setIsTimeOpen(false);
              }}
              className="flex h-8 items-center gap-2 rounded-md border border-[#1e293b] bg-black px-3 text-xs font-semibold text-slate-200 hover:border-blue-500/60 hover:text-white transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>{selectedProject}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isProjectOpen && (
              <div className="absolute left-0 top-9.5 z-50 w-48 rounded-md border border-[#1e293b] bg-black py-1 shadow-2xl backdrop-blur-md">
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
                    className={`flex w-full items-center px-2.5 py-1.5 text-xs transition-colors ${selectedProject === proj
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

          {/* Time Range Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsTimeOpen(!isTimeOpen);
                setIsProjectOpen(false);
              }}
              className="flex h-8 items-center gap-2 rounded-md border border-[#1e293b] bg-black px-3 text-xs font-medium text-slate-200 hover:border-blue-500/60 hover:text-white transition-colors"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span>{timeRangeLabels[timeRange]}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isTimeOpen && (
              <div className="absolute left-0 top-9.5 z-50 w-40 rounded-md border border-[#1e293b] bg-black py-1 shadow-2xl backdrop-blur-md">
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
                    className={`flex w-full items-center px-2.5 py-1.5 text-xs transition-colors ${timeRange === r
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
        </div>
      </div>

      {/* Sub-Tabs Navigation (Scrolls down to particular section) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
        {subTabs.map((subTab) => {
          const isActive = activeSubTab === subTab;
          return (
            <button
              key={subTab}
              onClick={() => {
                onSubTabChange(subTab);
                const map: Record<string, string> = {
                  Request: "section-request",
                  Latency: "section-latency",
                  Error: "section-error",
                  CPU: "section-cpu",
                };
                const targetId = map[subTab];
                if (targetId) {
                  const element = document.getElementById(targetId);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }
              }}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold"
                  : "text-slate-400 hover:bg-[#141414] hover:text-slate-200"
              }`}
            >
              {subTab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

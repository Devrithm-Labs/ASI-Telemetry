"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { DashboardFilters, SubTabItem } from "@/components/dashboard/dashboard-filters";
import { TracingSection } from "@/components/dashboard/sections/tracing-section";

export default function TracingPage() {
  const {
    selectedProject,
    setSelectedProject,
    timeRange,
    setTimeRange,
    isLive,
    setIsLive,
    handleRefresh,
    traces,
    setSelectedTrace,
  } = useDashboard();

  const [activeFilter, setActiveFilter] = React.useState("all");

  const errorCount = traces.filter((t) => t.status === "error").length;
  const rateLimitCount = traces.filter((t) => t.status === "rate_limited").length;
  const slowCount = traces.filter((t) => t.latencyMs > 500).length;

  const TRACE_TABS: SubTabItem[] = [
    { id: "all", label: "All Traces", badge: traces.length.toString() },
    { id: "error", label: "Errors (5xx)", badge: errorCount.toString() },
    { id: "rate_limited", label: "Rate Limited (429)", badge: rateLimitCount.toString() },
    { id: "slow", label: "Slow Spans (>500ms)", badge: slowCount.toString() },
  ];

  const filteredTraces = React.useMemo(() => {
    if (activeFilter === "error") return traces.filter((t) => t.status === "error");
    if (activeFilter === "rate_limited") return traces.filter((t) => t.status === "rate_limited");
    if (activeFilter === "slow") return traces.filter((t) => t.latencyMs > 500);
    return traces;
  }, [traces, activeFilter]);

  return (
    <>
      <DashboardFilters
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        subTabs={TRACE_TABS}
        activeSubTab={activeFilter}
        onSubTabChange={setActiveFilter}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        onRefresh={handleRefresh}
        routeCategory="Observability"
        routeTitle="Tracing & Spans"
        routeIcon={Activity}
        showLiveToggle={true}
        showTimeRange={true}
        showProjectSelector={true}
        extraControls={
          <span className="flex items-center gap-1.5 rounded-md border border-blue-900/60 bg-blue-950/40 px-2.5 py-1 text-[11px] font-mono font-semibold text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            
          </span>
        }
      />

      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        <TracingSection
          traces={filteredTraces}
          onSelectTrace={(trace) => setSelectedTrace(trace)}
          isLive={isLive}
        />
      </main>
    </>
  );
}

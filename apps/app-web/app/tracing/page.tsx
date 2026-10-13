"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { DashboardFilters, SubTabItem } from "@/components/dashboard/layout/filters";
import { DashboardFilterToolbar } from "@/components/dashboard/layout/dashboard-filter-toolbar";
import { TracingSection } from "@/components/dashboard/sections/tracing-section";

export default function TracingPage() {
  const {
    selectedProject,
    setSelectedProject,
    selectedFunction,
    setSelectedFunction,
    applications,
    timeRange,
    setTimeRange,
    isLive,
    handleRefresh,
    isRefreshing,
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
        subTabs={TRACE_TABS}
        activeSubTab={activeFilter}
        onSubTabChange={setActiveFilter}
        routeCategory="Observability"
        routeTitle="Tracing & Spans"
        routeIcon={Activity}
        hideFilterControls={true}
      />

      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        {/* Dashboard Title & Overview Header with Aligned Professional Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-[#1e293b]/70 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Live Trace Spans Stream
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Detailed waterfall traces, span execution latency, and error diagnostics recorded in ClickHouse.
            </p>
          </div>

          {/* Professional Filter UI Component */}
          <DashboardFilterToolbar
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
            selectedFunction={selectedFunction}
            onFunctionChange={setSelectedFunction}
            applications={applications}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </div>

        <TracingSection
          traces={filteredTraces}
          onSelectTrace={(trace) => setSelectedTrace(trace)}
          isLive={isLive}
        />
      </main>
    </>
  );
}

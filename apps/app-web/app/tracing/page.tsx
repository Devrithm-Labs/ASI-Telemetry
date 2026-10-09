"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { DashboardFilters, SubTabItem } from "@/components/dashboard/layout/filters";
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
    setIsLive,
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
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        selectedFunction={selectedFunction}
        onFunctionChange={setSelectedFunction}
        applications={applications}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        subTabs={TRACE_TABS}
        activeSubTab={activeFilter}
        onSubTabChange={setActiveFilter}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        routeCategory="Observability"
        routeTitle="Tracing & Spans"
        routeIcon={Activity}
        showLiveToggle={true}
        showTimeRange={true}
        showProjectSelector={true}
      />

      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        {/* Dashboard Title & Overview Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1e293b]/70 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Live Trace Spans Stream
              </h1>
              <span className="rounded-md border border-blue-500/30 bg-blue-950/40 px-2.5 py-0.5 text-xs font-mono font-medium text-blue-300">
                Agent: {selectedProject}
              </span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-300">
                fn: {selectedFunction === "all" ? "All Functions" : selectedFunction}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Detailed waterfall traces, span execution latency, and error diagnostics recorded in ClickHouse.
            </p>
          </div>
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

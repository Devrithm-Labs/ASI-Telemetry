"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
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
    handleRefresh,
    isRefreshing,
    traces,
    setSelectedTrace,
  } = useDashboard();

  return (
    <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
      {/* Dashboard Title & Overview Header with Route Breadcrumb and Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-[#1e293b]/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              Live Trace Spans Stream
            </h1>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#1e293b] bg-slate-100/90 dark:bg-[#0b1324] px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-xs">
              <span className="text-slate-400 dark:text-slate-500">Observability</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Tracing</span>
            </div>
          </div>
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
        traces={traces}
        onSelectTrace={(trace) => setSelectedTrace(trace)}
        isLive={false}
      />
    </main>
  );
}

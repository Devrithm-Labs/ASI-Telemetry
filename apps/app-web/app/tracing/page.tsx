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
      <div className="relative z-30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border pb-4">
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

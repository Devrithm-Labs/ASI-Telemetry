"use client";

import * as React from "react";
import Image from "next/image";
import { Home } from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { DashboardFilters } from "@/components/dashboard/layout/filters";
import { HomeSection } from "@/components/dashboard/sections/home-section";

export default function HomePage() {
  const {
    selectedProject,
    setSelectedProject,
    selectedFunction,
    setSelectedFunction,
    applications,
    handleRefresh,
    isRefreshing,
  } = useDashboard();

  return (
    <>
      <DashboardFilters
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        selectedFunction={selectedFunction}
        onFunctionChange={setSelectedFunction}
        applications={applications}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        routeCategory="Application"
        routeTitle="Home"
        routeIcon={Home}
        showTimeRange={false}
        showLiveToggle={false}
        extraControls={
          <span className="flex items-center gap-1.5 rounded-md border border-blue-900/60 bg-blue-950/40 px-2.5 py-1 text-xs font-semibold text-blue-300">
            <Image
              src="/image.png"
              alt="Python"
              width={14}
              height={14}
              className="h-3.5 w-3.5 object-contain"
            />
            <span>Python SDK Quickstart</span>
          </span>
        }
      />

      <main className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth space-y-10">
        <HomeSection projectName={selectedProject} />
      </main>
    </>
  );
}

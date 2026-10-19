"use client";

import * as React from "react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { HomeSection } from "@/components/dashboard/sections/home-section";

export default function DashboardPage() {
  const { selectedProject } = useDashboard();

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth space-y-10">
      <HomeSection projectName={selectedProject} />
    </main>
  );
}

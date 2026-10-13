"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Activity,
  Gauge,
  CheckCircle2,
  Server,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { DashboardFilters } from "@/components/dashboard/layout/filters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AllApplicationsPage() {
  const router = useRouter();
  const {
    applications,
    setSelectedProject,
    handleRefresh,
    isRefreshing,
  } = useDashboard();

  return (
    <>
      <DashboardFilters
        routeCategory="Application"
        routeTitle="All Applications"
        routeIcon={Boxes}
        showProjectSelector={false}
        showTimeRange={false}
        showLiveToggle={false}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        extraControls={
          <span className="flex items-center gap-1.5 rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{applications.length} Fleets Active</span>
          </span>
        }
      />

      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1e293b] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-black text-blue-600 dark:text-blue-400">
                <Boxes className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                All Monitored Applications &amp; Agent Fleets
              </h2>
              <span className="rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-700 dark:text-blue-300">
                {applications.length} Applications Live
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Fleet overview of all telemetry services reporting to ClickHouse database.
            </p>
          </div>

          <Button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
          >
            + Instrument New App
          </Button>
        </div>

        {/* Applications Grid */}
        {applications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-black p-8 text-center text-slate-500">
            <Server className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">No applications registered yet</h3>
            <p className="text-xs text-slate-500 mt-1">Send telemetry data using the Python SDK to start monitoring agents.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <Card
                key={app.agent_name}
                className="border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-black p-5 hover:border-blue-500/50 shadow-sm dark:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                        <Server className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{app.agent_name}</span>
                          <span className="rounded bg-slate-100 dark:bg-[#111111] border border-slate-200 dark:border-[#1e293b] px-1.5 py-0.2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {app.functions.length} functions
                          </span>
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Connected in ClickHouse</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Active agent reporting telemetry with functions: <span className="text-blue-600 dark:text-blue-300 font-mono">{app.functions.join(", ")}</span>
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-[#1e293b]">
                  <Button
                    onClick={() => {
                      setSelectedProject(app.agent_name);
                      router.push("/tool-monitoring");
                    }}
                    variant="outline"
                    className="flex-1 border-slate-200 dark:border-[#1e293b] bg-white dark:bg-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#111111] hover:text-slate-900 dark:hover:text-white hover:border-blue-500/60 text-xs font-semibold"
                  >
                    <Gauge className="h-3.5 w-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                    Tool Monitoring
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedProject(app.agent_name);
                      router.push("/tracing");
                    }}
                    variant="outline"
                    className="flex-1 border-slate-200 dark:border-[#1e293b] bg-white dark:bg-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#111111] hover:text-slate-900 dark:hover:text-white hover:border-blue-500/60 text-xs font-semibold"
                  >
                    <Activity className="h-3.5 w-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                    View Traces
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

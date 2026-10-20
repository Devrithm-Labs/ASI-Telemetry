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
      />

      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                <Boxes className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                All Monitored Applications &amp; Agent Fleets
              </h2>
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-mono font-medium text-foreground">
                {applications.length} Applications Live
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Fleet overview of all telemetry services reporting to ClickHouse database.
            </p>
          </div>

          
        </div>

        {/* Applications Grid */}
        {applications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            <Server className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold text-foreground">No applications registered yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Send telemetry data using the Python SDK to start monitoring agents.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <Card
                key={app.agent_name}
                className="border border-border bg-card p-5 hover:border-foreground/30 shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
                        <Server className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span>{app.agent_name}</span>
                          <span className="rounded bg-muted border border-border px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                            {app.functions.length} functions
                          </span>
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Connected in ClickHouse</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Active agent reporting telemetry with functions: <span className="text-foreground font-mono font-medium">{app.functions.join(", ")}</span>
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2 pt-3 border-t border-border">
                  <Button
                    onClick={() => {
                      setSelectedProject(app.agent_name);
                      router.push("/tool-monitoring");
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-medium"
                  >
                    <Gauge className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    Tool Monitoring
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedProject(app.agent_name);
                      router.push("/tracing");
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-medium"
                  >
                    <Activity className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
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

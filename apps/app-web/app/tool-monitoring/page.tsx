"use client";

import * as React from "react";
import { Gauge, LayoutDashboard, Bell } from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { DashboardFilters, SubTabItem } from "@/components/dashboard/layout/filters";
import { OverviewMetricsStrip } from "@/components/dashboard/overview-metrics-strip";
import { LatencySection } from "@/components/dashboard/sections/latency-section";
import { RequestSection } from "@/components/dashboard/sections/request-section";
import { ErrorSection } from "@/components/dashboard/sections/error-section";
import { CpuSection } from "@/components/dashboard/sections/cpu-section";

const TOOL_MONITORING_TABS: SubTabItem[] = [
  { id: "Request", label: "Request", targetId: "section-request" },
  { id: "Latency", label: "Latency", targetId: "section-latency" },
  { id: "Error", label: "Error", targetId: "section-error" },
  { id: "CPU", label: "CPU", targetId: "section-cpu" },
];

export default function ToolMonitoringPage() {
  const {
    selectedProject,
    setSelectedProject,
    timeRange,
    setTimeRange,
    activeHeaderTab,
    isLive,
    setIsLive,
    requestData,
    latencyData,
    cpuData,
    errorData,
    handleRefresh,
    isRefreshing,
    setIsDashboardModalOpen,
    setIsAlertModalOpen,
  } = useDashboard();

  const [activeSubTab, setActiveSubTab] = React.useState("Request");

  // Scroll spy to highlight active subtab as user scrolls through sections
  React.useEffect(() => {
    if (activeHeaderTab !== "Monitoring") return;

    const sectionIds = ["section-request", "section-latency", "section-error", "section-cpu"];
    const idToTab: Record<string, string> = {
      "section-request": "Request",
      "section-latency": "Latency",
      "section-error": "Error",
      "section-cpu": "CPU",
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const tab = idToTab[entry.target.id];
            if (tab) {
              setActiveSubTab(tab);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeHeaderTab]);

  return (
    <>
      {/* Route-Specific Filter Bar for Tool Monitoring */}
      <DashboardFilters
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        subTabs={TOOL_MONITORING_TABS}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        routeCategory="Observability"
        routeTitle="Tool Monitoring"
        routeIcon={Gauge}
        showLiveToggle={true}
        showTimeRange={true}
        showProjectSelector={true}
      />

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        {activeHeaderTab === "Monitoring" ? (
          <div className="space-y-6">
            {/* Top Overview KPI Metric Cards */}
            <OverviewMetricsStrip
              requestData={requestData}
              latencyData={latencyData}
              errorData={errorData}
              cpuData={cpuData}
              timeRange={timeRange}
              onCardClick={(tab) => {
                setActiveSubTab(tab);
                const map: Record<string, string> = {
                  Request: "section-request",
                  Latency: "section-latency",
                  Error: "section-error",
                  CPU: "section-cpu",
                };
                const id = map[tab];
                if (id) {
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            />

            {/* 1. Request Volume & Throughput Horizontal Section */}
            <div id="section-request" className="scroll-mt-6 transition-all duration-300">
              <RequestSection data={requestData} />
            </div>

            {/* 2. Latency Horizontal Section (Number + Bar Graph) */}
            <div id="section-latency" className="scroll-mt-6 transition-all duration-300">
              <LatencySection data={latencyData} />
            </div>

            {/* 3. Success, Failure & Error Horizontal Section */}
            <div id="section-error" className="scroll-mt-6 transition-all duration-300">
              <ErrorSection data={errorData} />
            </div>

            {/* 4. CPU & Compute Utilization Horizontal Section */}
            <div id="section-cpu" className="scroll-mt-6 transition-all duration-300">
              <CpuSection data={cpuData} />
            </div>
          </div>
        ) : null}

        {activeHeaderTab === "Dashboards" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Saved Observability Dashboards</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Custom telemetry views, multi-tenant agent fleets, and SLO tracking boards
                </p>
              </div>
              <button
                onClick={() => setIsDashboardModalOpen(true)}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                + New Board
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  title: "Production Agent Fleet Monitoring",
                  desc: "Live latency, error budgets, and token usage for primary agents.",
                  widgets: 8,
                  updated: "2 mins ago",
                },
                {
                  title: "Inference Gateway & LLM Cost",
                  desc: "Token consumption, rate limits (429), and provider latency.",
                  widgets: 5,
                  updated: "1 hour ago",
                },
                {
                  title: "Infrastructure & Host Nodes",
                  desc: "CPU core load, memory pressure, and container thread distribution.",
                  widgets: 6,
                  updated: "Yesterday",
                },
              ].map((dash, idx) => (
                <div
                  key={idx}
                  className="group rounded-xl border border-[#1e293b] bg-black p-5 shadow-lg hover:border-blue-500/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-mono text-blue-400">
                      {dash.widgets} Widgets
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                    {dash.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    {dash.desc}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-3 text-[11px] text-slate-500">
                    <span>Updated {dash.updated}</span>
                    <span className="text-blue-400 font-medium group-hover:underline">Open Board →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeHeaderTab === "Alerts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Active Alert Rules & Incidents</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Threshold monitor rules, SLA breaches, and incident routing
                </p>
              </div>
              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                + Add Alert Policy
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  name: "High P99 Tail Latency Breach",
                  condition: "P99 Latency > 300ms for 3 consecutive intervals",
                  status: "Healthy",
                  channel: "#ops-telemetry-alerts",
                  lastTriggered: "Never",
                },
                {
                  name: "Error Rate Spike Above SLO Target",
                  condition: "Failure Rate > 2.0% within 5m sliding window",
                  status: "Healthy",
                  channel: "#ops-telemetry-alerts, PagerDuty",
                  lastTriggered: "3 days ago",
                },
                {
                  name: "Host Compute Saturation Warning",
                  condition: "CPU Usage > 85% for > 10m",
                  status: "Warning",
                  channel: "#infra-alerts",
                  lastTriggered: "14 hours ago",
                },
              ].map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-[#1e293b] bg-black p-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-100">{rule.name}</h4>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {rule.condition}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-slate-400">
                      Destination: <span className="text-blue-300">{rule.channel}</span>
                    </div>
                    <span
                      className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
                        rule.status === "Healthy"
                          ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                          : "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                      }`}
                    >
                      {rule.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

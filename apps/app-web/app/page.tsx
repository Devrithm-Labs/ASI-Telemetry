"use client";

import * as React from "react";
import {
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { OverviewMetricsStrip } from "@/components/dashboard/overview-metrics-strip";
import { LatencySection } from "@/components/dashboard/sections/latency-section";
import { RequestSection } from "@/components/dashboard/sections/request-section";
import { ErrorSection } from "@/components/dashboard/sections/error-section";
import { CpuSection } from "@/components/dashboard/sections/cpu-section";
import { TracingSection } from "@/components/dashboard/sections/tracing-section";
import { HomeSection } from "@/components/dashboard/sections/home-section";
import { TraceModal } from "@/components/dashboard/trace-modal";
import { AlertModal } from "@/components/dashboard/alert-modal";
import { NewDashboardModal } from "@/components/dashboard/new-dashboard-modal";
import {
  TimeRange,
  TraceRecord,
  RequestMetricPoint,
  LatencyMetricPoint,
  CpuMetricPoint,
  ErrorMetricPoint,
} from "@/components/dashboard/dashboard-types";
import {
  getRequestData,
  getLatencyData,
  getCpuData,
  getErrorData,
  INITIAL_TRACES,
} from "@/components/dashboard/mock-data";

export default function ObservabilityDashboard() {
  const [selectedProject, setSelectedProject] = React.useState("devrithm");
  const [timeRange, setTimeRange] = React.useState<TimeRange>("7d");
  const [activeHeaderTab, setActiveHeaderTab] = React.useState<
    "Monitoring" | "Dashboards" | "Alerts"
  >("Monitoring");
  const [activeSubTab, setActiveSubTab] = React.useState("Traces");
  const [activeSidebarNav, setActiveSidebarNav] = React.useState("Home");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Modals state
  const [selectedTrace, setSelectedTrace] = React.useState<TraceRecord | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = React.useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = React.useState(false);

  // Live telemetry streaming simulation
  const [isLive, setIsLive] = React.useState(true);
  const [requestData, setRequestData] = React.useState<RequestMetricPoint[]>(() =>
    getRequestData("7d")
  );
  const [latencyData, setLatencyData] = React.useState<LatencyMetricPoint[]>(() =>
    getLatencyData("7d")
  );
  const [cpuData, setCpuData] = React.useState<CpuMetricPoint[]>(() =>
    getCpuData("7d")
  );
  const [errorData, setErrorData] = React.useState<ErrorMetricPoint[]>(() =>
    getErrorData("7d")
  );
  const [traces, setTraces] = React.useState<TraceRecord[]>(INITIAL_TRACES);

  // Update datasets when timeRange changes
  React.useEffect(() => {
    setRequestData(getRequestData(timeRange));
    setLatencyData(getLatencyData(timeRange));
    setCpuData(getCpuData(timeRange));
    setErrorData(getErrorData(timeRange));
  }, [timeRange]);

  // Live streaming ticker
  React.useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Fluctuate latest data point slightly
      setRequestData((prev) => {
        if (!prev.length) return prev;
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const last = copy[lastIdx]!;
        const deltaSuccess = Math.floor((Math.random() - 0.45) * 50);
        const newSuccess = Math.max(100, last.success + deltaSuccess);
        copy[lastIdx] = {
          ...last,
          success: newSuccess,
          total: newSuccess + last.failure,
        };
        return copy;
      });

      setCpuData((prev) => {
        if (!prev.length) return prev;
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const last = copy[lastIdx]!;
        const delta = Math.floor((Math.random() - 0.48) * 4);
        const newCpu = Math.min(95, Math.max(15, last.cpuPercent + delta));
        copy[lastIdx] = { ...last, cpuPercent: newCpu };
        return copy;
      });

      // Randomly spawn a fresh trace every few ticks
      if (Math.random() > 0.4) {
        const models = ["claude-3-5-sonnet", "gpt-4o", "gemini-1.5-pro", "text-embedding-3-large"];
        const operations = [
          "agent.planner.synthesize_plan",
          "rag.vector.semantic_search",
          "llm.stream_generation",
          "tool.sandbox.bash_exec",
          "db.telemetry.batch_flush",
        ];
        const randModel = models[Math.floor(Math.random() * models.length)]!;
        const randOp = operations[Math.floor(Math.random() * operations.length)]!;
        const isErr = Math.random() < 0.08;
        const isRate = !isErr && Math.random() < 0.05;
        const status = isErr ? "error" : isRate ? "rate_limited" : "success";
        const code = isErr ? 500 : isRate ? 429 : 200;
        const latency = Math.floor(Math.random() * (isErr ? 2500 : 350)) + 30;

        const now = new Date();
        const timeStr = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now
          .getDate()
          .toString()
          .padStart(2, "0")} ${now
          .getHours()
          .toString()
          .padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        const newTrace: TraceRecord = {
          id: `trc-${Math.random().toString(16).substring(2, 10)}`,
          name: randOp,
          service: "agent-runtime-core",
          status,
          statusCode: code,
          latencyMs: latency,
          cpuPercent: Math.floor(Math.random() * 40) + 15,
          tokens: Math.floor(Math.random() * 2400) + 200,
          model: randModel,
          timestamp: timeStr,
          spans: [
            { name: "context.retrieval", durationMs: Math.floor(latency * 0.2), status: "ok" },
            { name: "llm.stream_generation", durationMs: Math.floor(latency * 0.7), status: isErr ? "error" : "ok" },
            { name: "output.parse", durationMs: Math.floor(latency * 0.1), status: "ok" },
          ],
        };

        setTraces((prev) => [newTrace, ...prev.slice(0, 19)]);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isLive]);

  const handleRefresh = () => {
    setRequestData(getRequestData(timeRange));
    setLatencyData(getLatencyData(timeRange));
    setCpuData(getCpuData(timeRange));
    setErrorData(getErrorData(timeRange));
  };

  const handleSubTabChange = (tab: string) => {
    setActiveSubTab(tab);
    if (activeSidebarNav !== "Tool Monitoring") {
      setActiveSidebarNav("Tool Monitoring");
      setTimeout(() => {
        scrollToSection(tab);
      }, 100);
      return;
    }
    scrollToSection(tab);
  };

  const scrollToSection = (tab: string) => {
    const map: Record<string, string> = {
      Request: "section-request",
      Latency: "section-latency",
      Error: "section-error",
      CPU: "section-cpu",
    };
    const id = map[tab];
    if (id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Scroll spy to highlight active subtab as user scrolls through sections
  React.useEffect(() => {
    if (activeSidebarNav !== "Tool Monitoring" || activeHeaderTab !== "Monitoring") return;

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
  }, [activeSidebarNav, activeHeaderTab]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-slate-100 font-sans selection:bg-blue-600/30 selection:text-blue-200">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        activeNav={activeSidebarNav}
        onNavChange={(nav) => setActiveSidebarNav(nav)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Workspace Dashboard Content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-black">
        {/* Top Header */}
        <DashboardHeader
          activeTab={activeHeaderTab}
          onTabChange={(tab) => setActiveHeaderTab(tab)}
          onOpenAlertModal={() => setIsAlertModalOpen(true)}
          onOpenDashboardModal={() => setIsDashboardModalOpen(true)}
        />

        {/* Dashboard Filter Bar */}
        <DashboardFilters
          selectedProject={selectedProject}
          onProjectChange={(p) => setSelectedProject(p)}
          timeRange={timeRange}
          onTimeRangeChange={(r) => setTimeRange(r)}
          activeSubTab={activeSubTab}
          onSubTabChange={handleSubTabChange}
          isLive={isLive}
          onToggleLive={() => setIsLive(!isLive)}
          onRefresh={handleRefresh}
          activeNav={activeSidebarNav}
        />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
          {/* If Home is selected from side menu, render SDK Onboarding & Quickstart */}
          {activeSidebarNav === "Home" ? (
            <HomeSection
              onNavigateToTracing={() => setActiveSidebarNav("Tracing")}
              onNavigateToMonitoring={() => setActiveSidebarNav("Tool Monitoring")}
              onSendTestTrace={(newTrace) => {
                setTraces((prev) => [newTrace, ...prev]);
              }}
            />
          ) : activeSidebarNav === "Tracing" ? (
            /* If Tracing is selected from side menu, render dedicated Tracing section */
            <TracingSection
              traces={traces}
              onSelectTrace={(t) => setSelectedTrace(t)}
              isLive={isLive}
            />
          ) : activeHeaderTab === "Monitoring" ? (
            /* Otherwise, render overview cards at top + horizontal sections of each metric */
            <div className="space-y-6">
              {/* Top Overview KPI Metric Cards */}
              <OverviewMetricsStrip
                requestData={requestData}
                latencyData={latencyData}
                errorData={errorData}
                cpuData={cpuData}
                timeRange={timeRange}
                onCardClick={handleSubTabChange}
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

          {activeHeaderTab === "Dashboards" && activeSidebarNav !== "Tracing" && (
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

          {activeHeaderTab === "Alerts" && activeSidebarNav !== "Tracing" && (
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
      </div>

      {/* Trace Inspector Modal */}
      <TraceModal
        trace={selectedTrace}
        open={!!selectedTrace}
        onClose={() => setSelectedTrace(null)}
      />

      {/* New Alert Modal */}
      <AlertModal
        open={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
      />

      {/* New Dashboard Modal */}
      <NewDashboardModal
        open={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
      />
    </div>
  );
}

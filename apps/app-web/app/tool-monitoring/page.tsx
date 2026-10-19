"use client";

import * as React from "react";
import { Gauge, LayoutDashboard, Bell, Copy, Check, Pencil } from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { DashboardFilters, SubTabItem } from "@/components/dashboard/layout/filters";
import { DashboardFilterToolbar } from "@/components/dashboard/layout/dashboard-filter-toolbar";
import { OverviewMetricsStrip } from "@/components/dashboard/overview-metrics-strip";
import { LatencySection } from "@/components/dashboard/sections/latency-section";
import { RequestSection } from "@/components/dashboard/sections/request-section";
import { ErrorSection } from "@/components/dashboard/sections/error-section";

const TOOL_MONITORING_TABS: SubTabItem[] = [
  { id: "Request", label: "Request", targetId: "section-request" },
  { id: "Latency", label: "Response Time", targetId: "section-latency" },
  { id: "Error", label: "Error", targetId: "section-error" },
];

export default function ToolMonitoringPage() {
  const {
    selectedProject,
    setSelectedProject,
    selectedFunction,
    setSelectedFunction,
    applications,
    timeRange,
    setTimeRange,
    activeHeaderTab,
    summary,
    requestData,
    latencyData,
    errorData,
    handleRefresh,
    isRefreshing,
    setIsDashboardModalOpen,
    setIsAlertModalOpen,
  } = useDashboard();

  const [activeSubTab, setActiveSubTab] = React.useState("Request");

  // Agent Identity custom handle and clipboard state
  const [customHandles, setCustomHandles] = React.useState<Record<string, string>>({});
  const [isEditingHandle, setIsEditingHandle] = React.useState(false);
  const [handleInput, setHandleInput] = React.useState("");
  const [copiedTarget, setCopiedTarget] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("asi_agent_handles");
      if (saved) setCustomHandles(JSON.parse(saved));
    } catch {}
  }, []);

  const isAllAgents =
    !selectedProject ||
    selectedProject === "all-applications" ||
    selectedProject === "All Applications" ||
    selectedProject === "all" ||
    selectedProject === "All Agents";

  const activeAgentKey = !isAllAgents ? selectedProject : "";

  const currentHandle =
    (activeAgentKey && customHandles[activeAgentKey]) ||
    summary?.agent_handle ||
    (activeAgentKey ? `@${activeAgentKey}` : "");

  const currentAddress = summary?.agent_address || "";

  const handleCopy = (text: string, target: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 1800);
  };

  const handleSaveHandle = () => {
    if (!handleInput.trim() || !activeAgentKey) {
      setIsEditingHandle(false);
      return;
    }
    let formatted = handleInput.trim();
    if (!formatted.startsWith("@")) formatted = `@${formatted}`;
    const next = { ...customHandles, [activeAgentKey]: formatted };
    setCustomHandles(next);
    try {
      localStorage.setItem("asi_agent_handles", JSON.stringify(next));
    } catch {}
    setIsEditingHandle(false);
  };

  // Scroll spy to highlight active subtab as user scrolls through sections
  React.useEffect(() => {
    if (activeHeaderTab !== "Monitoring") return;

    const sectionIds = ["section-request", "section-latency", "section-error"];
    const idToTab: Record<string, string> = {
      "section-request": "Request",
      "section-latency": "Latency",
      "section-error": "Error",
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
      {/* Route Navigation & Section Sub-Tabs Bar */}
      <DashboardFilters
        subTabs={TOOL_MONITORING_TABS}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        routeCategory="Observability"
        routeTitle="Tool Monitoring"
        routeIcon={Gauge}
        hideFilterControls={true}
      />

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        {activeHeaderTab === "Monitoring" ? (
          <div className="space-y-6">
            {/* Dashboard Title & Overview Header with Aligned Professional Filter Toolbar */}
            <div className="relative z-30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-[#1e293b]/70 pb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Tool Monitoring
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Real-time telemetry observability for agent tools, latency percentiles, and SLA tracking.
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

            {/* Agent Identity Box: Agent Handle & Agent Address (visible only when an individual agent is selected) */}
            {!isAllAgents && (
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-card/60 px-5 py-3.5 backdrop-blur-sm shadow-xs">
                <div className="flex flex-wrap items-center gap-10">
                  {/* Agent Handle */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <span>Agent Handle</span>
                      {!isEditingHandle && (
                        <button
                          onClick={() => {
                            setHandleInput(currentHandle);
                            setIsEditingHandle(true);
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                          title="Edit agent handle name"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {isEditingHandle ? (
                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="text"
                          value={handleInput}
                          onChange={(e) => setHandleInput(e.target.value)}
                          placeholder="@agent-handle"
                          className="h-7 w-48 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveHandle();
                            if (e.key === "Escape") setIsEditingHandle(false);
                          }}
                        />
                        <button
                          onClick={handleSaveHandle}
                          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingHandle(false)}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {currentHandle}
                        </span>
                        <button
                          onClick={() => handleCopy(currentHandle, "handle")}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Copy agent handle"
                        >
                          {copiedTarget === "handle" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Agent Address */}
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-foreground">
                      Agent Address
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground" title={currentAddress}>
                        {currentAddress}
                      </span>
                      <button
                        onClick={() => handleCopy(currentAddress, "address")}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Copy agent address"
                      >
                        {copiedTarget === "address" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground border border-border">
                    Agent: <strong className="text-foreground">{activeAgentKey}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Top Overview KPI Metric Cards (Simplified, with Uptime replacing CPU/Memory) */}
            <OverviewMetricsStrip
              summary={summary}
              requestData={requestData}
              latencyData={latencyData}
              errorData={errorData}
              timeRange={timeRange}
              onCardClick={(tab) => {
                setActiveSubTab(tab === "Response Time" ? "Latency" : tab);
                const map: Record<string, string> = {
                  Request: "section-request",
                  Latency: "section-latency",
                  "Response Time": "section-latency",
                  Error: "section-error",
                };
                const id = map[tab];
                if (id) {
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            />

            {/* 1. Request Volume & Throughput Section */}
            <div id="section-request" className="space-y-3 scroll-mt-6 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-border/80 pb-2 select-none">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <span>Request Volume &amp; Throughput</span>
                  </h2>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {(summary?.total_requests ?? requestData.reduce((acc, curr) => acc + curr.total, 0)).toLocaleString()} requests recorded
                </span>
              </div>
              <RequestSection data={requestData} timeRange={timeRange} summary={summary} />
            </div>

            {/* 2. Latency Section */}
            <div id="section-latency" className="space-y-3 scroll-mt-6 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-border/80 pb-2 select-none">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <span>Average Latency</span>
                  </h2>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Target SLA: 300ms
                </span>
              </div>
              <LatencySection data={latencyData} summary={summary} />
            </div>

            {/* 3. Success, Failure & Error Section */}
            <div id="section-error" className="space-y-3 scroll-mt-6 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-border/80 pb-2 select-none">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <span>Failures &amp; Error Incidents</span>
                  </h2>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {(summary?.total_errors ?? errorData.reduce((acc, curr) => acc + curr.timeout + curr.rateLimit + curr.serverError + curr.validationError, 0)).toLocaleString()} failed invocations
                </span>
              </div>
              <ErrorSection data={errorData} summary={summary} />
            </div>
          </div>
        ) : null}

        {activeHeaderTab === "Dashboards" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Saved Observability Dashboards</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Custom telemetry views, multi-tenant agent fleets, and SLO tracking boards
                </p>
              </div>
              <button
                onClick={() => setIsDashboardModalOpen(true)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
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
                  desc: "Error budgets, response times, and container thread distribution.",
                  widgets: 6,
                  updated: "Yesterday",
                },
              ].map((dash, idx) => (
                <div
                  key={idx}
                  className="group rounded-xl border border-border bg-card p-5 shadow-xs hover:border-foreground/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {dash.widgets} Widgets
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:underline transition-colors">
                    {dash.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {dash.desc}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                    <span>Updated {dash.updated}</span>
                    <span className="text-foreground font-medium group-hover:underline">Open Board →</span>
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
                <h2 className="text-lg font-bold text-foreground">Active Alert Rules &amp; Incidents</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Threshold monitor rules, SLA breaches, and incident routing
                </p>
              </div>
              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
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
              ].map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{rule.name}</h4>
                      <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                        {rule.condition}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-muted-foreground">
                      Destination: <span className="text-foreground font-medium">{rule.channel}</span>
                    </div>
                    <span
                      className={`rounded-md border border-border px-2.5 py-0.5 text-[11px] font-medium ${
                        rule.status === "Healthy"
                          ? "bg-secondary text-secondary-foreground"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-500"
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

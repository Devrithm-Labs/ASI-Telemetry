"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Activity,
  Gauge,
  Bot,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { DashboardFilters } from "@/components/dashboard/layout/filters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const APPLICATIONS = [
  {
    id: "devrithm",
    name: "devrithm",
    description: "Main customer-facing conversational agent orchestrator & planner.",
    version: "v2.8.4",
    status: "Healthy",
    rps: "412 req/s",
    avgLatency: "138 ms",
    errorRate: "0.21%",
    traces24h: "1.2M",
  },
  {
    id: "agent-runtime-core",
    name: "agent-runtime-core",
    description: "Autonomous tool execution sandbox, bash execs, and code runners.",
    version: "v1.4.1",
    status: "Healthy",
    rps: "184 req/s",
    avgLatency: "245 ms",
    errorRate: "0.48%",
    traces24h: "540K",
  },
  {
    id: "asi-llm-gateway",
    name: "asi-llm-gateway",
    description: "Inference router, model rate-limiting, token caching & cost tracker.",
    version: "v3.1.0",
    status: "Healthy",
    rps: "890 req/s",
    avgLatency: "162 ms",
    errorRate: "0.15%",
    traces24h: "2.8M",
  },
  {
    id: "vector-search-svc",
    name: "vector-search-svc",
    description: "Semantic embedding index, Pinecone/Qdrant vector similarity retriever.",
    version: "v1.9.2",
    status: "Healthy",
    rps: "240 req/s",
    avgLatency: "42 ms",
    errorRate: "0.05%",
    traces24h: "890K",
  },
];

export default function AllApplicationsPage() {
  const router = useRouter();
  const {
    selectedProject,
    setSelectedProject,
    timeRange,
    setTimeRange,
    isLive,
    setIsLive,
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
          <span className="flex items-center gap-1.5 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>4 Fleets Healthy</span>
          </span>
        }
      />

      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1e293b] bg-black text-blue-400">
                <Boxes className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                All Monitored Applications & Agent Fleets
              </h2>
              <span className="rounded-full border border-blue-900/60 bg-blue-950/40 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-300">
                {APPLICATIONS.length} Applications Active
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Fleet overview of all telemetry services reporting to ASI-Telemetry collector.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APPLICATIONS.map((app) => (
            <Card
              key={app.id}
              className="border border-[#1e293b] bg-black p-5 hover:border-blue-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
                      <Server className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{app.name}</span>
                        <span className="rounded bg-[#111111] border border-[#1e293b] px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
                          {app.version}
                        </span>
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{app.status}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {app.traces24h} traces
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  {app.description}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#1e293b] pt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Throughput</span>
                    <div className="font-semibold text-white font-mono mt-0.5">{app.rps}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Avg Latency</span>
                    <div className="font-semibold text-blue-300 font-mono mt-0.5">{app.avgLatency}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Error Rate</span>
                    <div className="font-semibold text-slate-200 font-mono mt-0.5">{app.errorRate}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 pt-3 border-t border-[#1e293b]">
                <Button
                  onClick={() => {
                    setSelectedProject(app.id);
                    router.push("/tool-monitoring");
                  }}
                  variant="outline"
                  className="flex-1 border-[#1e293b] bg-black text-slate-300 hover:bg-[#111111] hover:text-white hover:border-blue-500/60 text-xs font-semibold"
                >
                  <Gauge className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                  Tool Monitoring
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProject(app.id);
                    router.push("/tracing");
                  }}
                  variant="outline"
                  className="flex-1 border-[#1e293b] bg-black text-slate-300 hover:bg-[#111111] hover:text-white hover:border-blue-500/60 text-xs font-semibold"
                >
                  <Activity className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                  View Traces
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}

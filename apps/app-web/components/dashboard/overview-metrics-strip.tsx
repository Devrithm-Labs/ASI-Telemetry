"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  RequestMetricPoint,
  ResponseTimeMetricPoint,
  ErrorMetricPoint,
  CpuMetricPoint,
  TimeRange,
  MetricSummary,
} from "./context/dashboard-types";

interface OverviewMetricsStripProps {
  requestData: RequestMetricPoint[];
  latencyData?: ResponseTimeMetricPoint[];
  responseTimeData?: ResponseTimeMetricPoint[];
  errorData: ErrorMetricPoint[];
  cpuData: CpuMetricPoint[];
  timeRange: TimeRange;
  summary?: MetricSummary | null;
  onCardClick?: (section: string) => void;
}

export function OverviewMetricsStrip({
  requestData,
  latencyData,
  responseTimeData,
  errorData,
  cpuData,
  timeRange,
  summary,
  onCardClick,
}: OverviewMetricsStripProps) {
  const times = responseTimeData || latencyData || [];

  // Use pre-calculated backend summary if available, otherwise fallback
  const totalRequests = summary?.total_requests ?? requestData.reduce((acc, curr) => acc + curr.total, 0);
  const totalSuccess = summary?.total_success ?? requestData.reduce((acc, curr) => acc + curr.success, 0);
  const totalFailure = summary?.total_errors ?? requestData.reduce((acc, curr) => acc + curr.failure, 0);

  const successRate = summary?.success_rate != null
    ? summary.success_rate.toFixed(1)
    : (totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(1) : "0");

  const errorRate = summary?.error_rate != null
    ? summary.error_rate.toFixed(1)
    : (totalRequests > 0 ? ((totalFailure / totalRequests) * 100).toFixed(1) : "0.0");

  const avgRespTime = summary?.avg_response_time_ms != null
    ? Math.round(summary.avg_response_time_ms)
    : (times.length > 0 ? Math.round(times.reduce((acc, curr) => acc + curr.p50, 0) / times.length) : 0);

  const latestCpu = summary?.current_cpu != null
    ? Math.round(summary.current_cpu)
    : (cpuData.length > 0 ? cpuData[cpuData.length - 1]?.cpuPercent : 0);

  const latestMem = summary?.current_memory != null
    ? Math.round(summary.current_memory)
    : (cpuData.length > 0 ? cpuData[cpuData.length - 1]?.memoryPercent : 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Total Requests Card */}
      <Card
        onClick={() => onCardClick?.("Request")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-blue-500 transition-colors uppercase tracking-wider">
            Total Requests
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
            <Activity className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground font-mono tracking-tight">
          {totalRequests.toLocaleString()} <span className="text-xs font-sans font-medium text-muted-foreground">reqs</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>ClickHouse Synced</span>
          <span className="text-blue-500 font-medium">All Endpoints</span>
        </div>
      </Card>

      {/* 2. Success Rate Card */}
      <Card
        onClick={() => onCardClick?.("Request")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-emerald-500 transition-colors uppercase tracking-wider">
            Success Rate
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-500 font-mono tracking-tight">
          {successRate}% <span className="text-xs font-sans font-medium text-emerald-500/80">Reliability</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Target: &gt;99%</span>
          <span className="text-emerald-500 font-medium">{totalSuccess.toLocaleString()} OK</span>
        </div>
      </Card>

      {/* 3. Failure & Errors Card */}
      <Card
        onClick={() => onCardClick?.("Error")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-rose-500/50 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-rose-500 transition-colors uppercase tracking-wider">
            Failure Rate
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-rose-500 font-mono tracking-tight">
          {errorRate}% <span className="text-xs font-sans font-medium text-rose-500/80">{totalFailure} Errors</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>SLO: &lt;1.0%</span>
          <span className="text-rose-500 font-medium">{totalFailure > 0 ? "Faults Logged" : "Zero Errors"}</span>
        </div>
      </Card>

      {/* 4. Average Response Time Card */}
      <Card
        onClick={() => onCardClick?.("Response Time")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-blue-500 transition-colors uppercase tracking-wider">
            Avg Latency
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-blue-500 font-mono tracking-tight">
          {avgRespTime} <span className="text-xs font-sans font-medium text-blue-400">ms</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>P50 Median</span>
          <span className="text-blue-500 font-medium">SLA: 300ms</span>
        </div>
      </Card>

      {/* 5. CPU Utilization Card */}
      <Card
        onClick={() => onCardClick?.("CPU")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-amber-500/50 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-amber-500 transition-colors uppercase tracking-wider">
            CPU / Memory
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
            <Cpu className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-500 font-mono tracking-tight">
          {latestCpu}% <span className="text-xs font-sans font-medium text-muted-foreground">/ {latestMem} MB</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Host Pressure</span>
          <span className="text-amber-500 font-medium">Live Probe</span>
        </div>
      </Card>
    </div>
  );
}

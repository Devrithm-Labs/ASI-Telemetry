"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
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
  cpuData?: CpuMetricPoint[];
  timeRange: TimeRange;
  summary?: MetricSummary | null;
  onCardClick?: (section: string) => void;
}

export function OverviewMetricsStrip({
  requestData,
  latencyData,
  responseTimeData,
  summary,
  onCardClick,
}: OverviewMetricsStripProps) {
  const times = responseTimeData || latencyData || [];

  // Use pre-calculated backend summary if available, otherwise fallback
  const totalRequests = summary?.total_requests ?? requestData.reduce((acc, curr) => acc + curr.total, 0);

  const successRate = summary?.success_rate != null
    ? summary.success_rate.toFixed(1)
    : (totalRequests > 0 ? "100.0" : "100.0");

  const errorRate = summary?.error_rate != null
    ? summary.error_rate.toFixed(1)
    : "0.0";

  const avgRespTime = summary?.avg_response_time_ms != null
    ? Math.round(summary.avg_response_time_ms)
    : (times.length > 0 ? Math.round(times.reduce((acc, curr) => acc + curr.p50, 0) / times.length) : 0);

  const uptime = summary?.uptime != null
    ? summary.uptime.toFixed(1)
    : successRate;

  const uptimeDesc = summary?.uptime_desc || "Percent of requests the agent replied to in the last 30 days.";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Total Requests Card */}
      <Card
        onClick={() => onCardClick?.("Request")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-md flex flex-col justify-between"
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
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          Recorded across active tools
        </p>
      </Card>

      {/* 2. Success Rate Card */}
      <Card
        onClick={() => onCardClick?.("Request")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group hover:shadow-md flex flex-col justify-between"
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
          {successRate}%
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          Target SLO: &gt;99%
        </p>
      </Card>

      {/* 3. Failure & Errors Card */}
      <Card
        onClick={() => onCardClick?.("Error")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-rose-500/50 transition-all cursor-pointer group hover:shadow-md flex flex-col justify-between"
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
          {errorRate}%
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          SLO threshold: &lt;1.0%
        </p>
      </Card>

      {/* 4. Average Response Time Card */}
      <Card
        onClick={() => onCardClick?.("Response Time")}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-md flex flex-col justify-between"
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
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          Target SLA: 300ms
        </p>
      </Card>

      {/* 5. Uptime Card (Calculates % of requests replied in last 30 days) */}
      <Card
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group hover:shadow-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-emerald-500 transition-colors uppercase tracking-wider">
            Uptime
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono tracking-tight">
          {uptime}%
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1" title={uptimeDesc}>
          {uptimeDesc}
        </p>
      </Card>
    </div>
  );
}

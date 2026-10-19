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
  TimeRange,
  MetricSummary,
} from "./context/dashboard-types";

interface OverviewMetricsStripProps {
  requestData: RequestMetricPoint[];
  latencyData?: ResponseTimeMetricPoint[];
  responseTimeData?: ResponseTimeMetricPoint[];
  errorData: ErrorMetricPoint[];
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
    : (times.length > 0 ? Math.round(times.reduce((acc, curr) => acc + (curr.p50 ?? 0), 0) / times.length) : 0);

  const uptime = summary?.uptime != null
    ? summary.uptime.toFixed(1)
    : successRate;

  const uptimeDesc = summary?.uptime_desc || "Percent of requests the agent replied to in the last 30 days.";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Total Requests Card */}
      <Card
        onClick={() => onCardClick?.("Request")}
        className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Requests
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
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
        className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Success Rate
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground font-mono tracking-tight">
          {successRate}%
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          Target SLO: &gt;99%
        </p>
      </Card>

      {/* 3. Failure & Errors Card */}
      <Card
        onClick={() => onCardClick?.("Error")}
        className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Failure Rate
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground font-mono tracking-tight">
          {errorRate}%
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          SLO threshold: &lt;1.0%
        </p>
      </Card>

      {/* 4. Average Response Time Card */}
      <Card
        onClick={() => onCardClick?.("Response Time")}
        className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Avg Latency
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground font-mono tracking-tight">
          {avgRespTime} <span className="text-xs font-sans font-medium text-muted-foreground">ms</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          Target SLA: 300ms
        </p>
      </Card>

      {/* 5. Uptime Card */}
      <Card
        className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Uptime
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground font-mono tracking-tight">
          {uptime}%
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1" title={uptimeDesc}>
          {uptimeDesc}
        </p>
      </Card>
    </div>
  );
}

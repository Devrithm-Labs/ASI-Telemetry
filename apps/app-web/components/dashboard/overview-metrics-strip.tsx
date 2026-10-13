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
        className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-lg hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors uppercase tracking-wider">Total Requests</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
          {totalRequests.toLocaleString()} <span className="text-sm font-sans font-medium text-slate-500 dark:text-slate-400">Reqs</span>
        </div>
      </Card>

      {/* 2. Success Rate Card */}
      <Card
        onClick={() => onCardClick?.("Request")}
        className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-lg hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors uppercase tracking-wider">Success Rate</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
          {successRate}% <span className="text-sm font-sans font-medium text-emerald-600/80 dark:text-emerald-400/80">Reliability</span>
        </div>
      </Card>

      {/* 3. Failure & Errors Card */}
      <Card
        onClick={() => onCardClick?.("Error")}
        className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-lg hover:border-rose-500/60 dark:hover:border-rose-500/60 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors uppercase tracking-wider">Failure Rate</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
          {errorRate}% <span className="text-sm font-sans font-medium text-rose-600/80 dark:text-rose-400/80">{totalFailure} Errors</span>
        </div>
      </Card>

      {/* 4. Average Response Time Card */}
      <Card
        onClick={() => onCardClick?.("Response Time")}
        className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-lg hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors uppercase tracking-wider">Avg Latency</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tracking-tight">
          {avgRespTime} <span className="text-sm font-sans font-medium text-blue-600/80 dark:text-blue-300">ms</span>
        </div>
      </Card>

      {/* 5. CPU Utilization Card */}
      <Card
        onClick={() => onCardClick?.("CPU")}
        className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-lg hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all cursor-pointer group hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors uppercase tracking-wider">CPU / Memory</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
            <Cpu className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
          {latestCpu}% <span className="text-sm font-sans font-medium text-slate-500 dark:text-slate-400">/ {latestMem} MB</span>
        </div>
      </Card>
    </div>
  );
}

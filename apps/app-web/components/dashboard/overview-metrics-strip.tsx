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
    : (totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(1) : "100.0");

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
        className="rounded-xl border border-[#1e293b] bg-black p-4 shadow-lg hover:border-blue-500/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-blue-300 transition-colors">Total Requests</span>
          <Activity className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-white font-mono">
          {totalRequests}
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          Recorded in ClickHouse
        </div>
      </Card>

      {/* 2. Success Rate Card */}
      <Card
        onClick={() => onCardClick?.("Request")}
        className="rounded-xl border border-[#1e293b] bg-black p-4 shadow-lg hover:border-blue-500/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-blue-300 transition-colors">Success Rate</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
          {successRate}%
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          {totalSuccess} successful runs
        </div>
      </Card>

      {/* 3. Failure & Errors Card */}
      <Card
        onClick={() => onCardClick?.("Error")}
        className="rounded-xl border border-[#1e293b] bg-black p-4 shadow-lg hover:border-blue-500/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-blue-300 transition-colors">Failure & Errors</span>
          <AlertTriangle className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-white font-mono">
          {errorRate}%
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          {totalFailure} faults recorded
        </div>
      </Card>

      {/* 4. Average Response Time Card */}
      <Card
        onClick={() => onCardClick?.("Response Time")}
        className="rounded-xl border border-[#1e293b] bg-black p-4 shadow-lg hover:border-blue-500/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-blue-300 transition-colors">Avg Response Time</span>
          <Clock className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-blue-400 font-mono">
          {avgRespTime} <span className="text-base font-sans font-normal text-blue-300">ms</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          Calculated by ClickHouse
        </div>
      </Card>

      {/* 5. CPU Utilization Card */}
      <Card
        onClick={() => onCardClick?.("CPU")}
        className="rounded-xl border border-[#1e293b] bg-black p-4 shadow-lg hover:border-blue-500/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-blue-300 transition-colors">CPU / RAM Usage</span>
          <Cpu className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">
          {latestCpu}% / {latestMem}%
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          Host agent resource footprint
        </div>
      </Card>
    </div>
  );
}

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
  LatencyMetricPoint,
  ErrorMetricPoint,
  CpuMetricPoint,
  TimeRange,
} from "./dashboard-types";

interface OverviewMetricsStripProps {
  requestData: RequestMetricPoint[];
  latencyData: LatencyMetricPoint[];
  errorData: ErrorMetricPoint[];
  cpuData: CpuMetricPoint[];
  timeRange: TimeRange;
  onCardClick?: (section: string) => void;
}

export function OverviewMetricsStrip({
  requestData,
  latencyData,
  errorData,
  cpuData,
  timeRange,
  onCardClick,
}: OverviewMetricsStripProps) {
  const totalSuccess = React.useMemo(
    () => requestData.reduce((acc, curr) => acc + curr.success, 0),
    [requestData]
  );
  const totalFailure = React.useMemo(
    () => requestData.reduce((acc, curr) => acc + curr.failure, 0),
    [requestData]
  );
  const totalRequests = totalSuccess + totalFailure;

  const successRate = totalRequests > 0
    ? ((totalSuccess / totalRequests) * 100).toFixed(2)
    : "99.28";

  const avgLatency = React.useMemo(
    () =>
      Math.round(
        latencyData.reduce((acc, curr) => acc + curr.p50, 0) /
          (latencyData.length || 1)
      ),
    [latencyData]
  );

  const latestErrorRate =
    errorData.length > 0 ? errorData[errorData.length - 1]?.errorRate : 0.72;

  const latestCpu =
    cpuData.length > 0 ? cpuData[cpuData.length - 1]?.cpuPercent : 38;

  const formattedRequests = React.useMemo(() => {
    if (totalRequests >= 1000000) return `${(totalRequests / 1000000).toFixed(2)}M`;
    if (totalRequests >= 1000) return `${(totalRequests / 1000).toFixed(1)}k`;
    return totalRequests.toLocaleString();
  }, [totalRequests]);

  const formattedSuccess = React.useMemo(() => {
    if (totalSuccess >= 1000000) return `${(totalSuccess / 1000000).toFixed(2)}M`;
    if (totalSuccess >= 1000) return `${(totalSuccess / 1000).toFixed(1)}k`;
    return totalSuccess.toLocaleString();
  }, [totalSuccess]);

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
          {formattedRequests}
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          Peak: 1,420 req/s • +14.2% trend
        </div>
      </Card>

      {/* 2. Success Rate Card */}
      <Card
        onClick={() => onCardClick?.("Request")}
        className="rounded-xl border border-[#1e293b] bg-black p-4 shadow-lg hover:border-blue-500/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-blue-300 transition-colors">Success Rate</span>
          <CheckCircle2 className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-blue-400 font-mono">
          {successRate}%
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          {formattedSuccess} successful runs
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
          {latestErrorRate}%
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          {totalFailure.toLocaleString()} faults • &lt;1.0% SLO
        </div>
      </Card>

      {/* 4. Average Latency Card */}
      <Card
        onClick={() => onCardClick?.("Latency")}
        className="rounded-xl border border-[#1e293b] bg-black p-4 shadow-lg hover:border-blue-500/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-blue-300 transition-colors">Average Trace Latency</span>
          <Clock className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-blue-400 font-mono">
          {avgLatency} <span className="text-base font-sans font-normal text-blue-300">ms</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          P50: {avgLatency}ms • SLA &lt;300ms
        </div>
      </Card>

      {/* 5. CPU Utilization Card */}
      <Card
        onClick={() => onCardClick?.("CPU")}
        className="rounded-xl border border-[#1e293b] bg-black p-4 shadow-lg hover:border-blue-500/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-blue-300 transition-colors">CPU Utilization</span>
          <Cpu className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-white font-mono">
          {latestCpu}%
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          16 Cores • Load: 6.0 (healthy)
        </div>
      </Card>
    </div>
  );
}

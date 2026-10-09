"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Layers,
  Radio,
  Server,
  Zap,
} from "lucide-react";
import { TraceRecord } from "../context/dashboard-types";
import { TraceTable } from "../trace-table";
import { Card, CardContent } from "@/components/ui/card";

interface TracingSectionProps {
  traces: TraceRecord[];
  onSelectTrace: (trace: TraceRecord) => void;
  isLive: boolean;
}

export function TracingSection({
  traces,
  onSelectTrace,
  isLive,
}: TracingSectionProps) {
  const successCount = traces.filter((t) => t.status === "success").length;
  const errorCount = traces.filter((t) => t.status === "error").length;
  const rateLimitCount = traces.filter((t) => t.status === "rate_limited").length;
  const avgLatency = Math.round(
    traces.reduce((acc, t) => acc + t.latencyMs, 0) / (traces.length || 1)
  );

  return (
    <div className="space-y-6">
      {/* Tracing Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1e293b] bg-black text-blue-400">
              <Activity className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Distributed Traces & Spans
            </h2>
            <span className="rounded-full border border-blue-900/60 bg-blue-950/40 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-300">
              {traces.length} Live Traces
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time execution call trees, tool invocation latencies, and OpenTelemetry spans.
          </p>
        </div>
      </div>

      {/* Tracing Overview Metric Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-[#1e293b] bg-black p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Streamed Traces</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {traces.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Buffer: last 20 execution runs
          </div>
        </Card>

        <Card className="border border-[#1e293b] bg-black p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Successful Spans</span>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-300 font-mono">
            {successCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {((successCount / (traces.length || 1)) * 100).toFixed(0)}% execution rate
          </div>
        </Card>

        <Card className="border border-[#1e293b] bg-black p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Errored & Throttled</span>
            <AlertTriangle className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {errorCount + rateLimitCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {errorCount} faults, {rateLimitCount} throttled
          </div>
        </Card>

        <Card className="border border-[#1e293b] bg-black p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Average Trace Latency</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400 font-mono">
            {avgLatency} <span className="text-sm font-sans">ms</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Measured across all active spans
          </div>
        </Card>
      </div>

      {/* Main Full-Width Trace Execution Logs Table */}
      <TraceTable
        traces={traces}
        onSelectTrace={onSelectTrace}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { TraceRecord } from "../context/dashboard-types";
import { TraceTable } from "../trace-table";
import { Card } from "@/components/ui/card";

interface TracingSectionProps {
  traces: TraceRecord[];
  onSelectTrace: (trace: TraceRecord) => void;
  isLive: boolean;
}

export function TracingSection({
  traces,
  onSelectTrace,
}: TracingSectionProps) {
  const successCount = traces.filter((t) => t.status === "success").length;
  const errorCount = traces.filter((t) => t.status === "error").length;
  const rateLimitCount = traces.filter((t) => t.status === "rate_limited").length;
  const avgLatency = Math.round(
    traces.reduce((acc, t) => acc + t.latencyMs, 0) / (traces.length || 1)
  );

  return (
    <div className="space-y-6">
      {/* Tracing Overview Metric Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Streamed Traces</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {traces.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Buffer: live stream execution spans
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Successful Spans</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {successCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {((successCount / (traces.length || 1)) * 100).toFixed(0)}% execution reliability
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Errored & Throttled</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {errorCount + rateLimitCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {errorCount} faults, {rateLimitCount} throttled
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Average Trace Latency</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {avgLatency} <span className="text-sm font-sans font-normal text-slate-500 dark:text-slate-400">ms</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
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

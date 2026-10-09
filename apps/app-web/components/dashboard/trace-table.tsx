"use client";

import * as React from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  Filter,
  Search,
  SlidersHorizontal,
  XCircle,
  Zap,
} from "lucide-react";
import { TraceRecord } from "./context/dashboard-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TraceTableProps {
  traces: TraceRecord[];
  onSelectTrace: (trace: TraceRecord) => void;
}

export function TraceTable({ traces, onSelectTrace }: TraceTableProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "success" | "error" | "rate_limited">("all");

  const filteredTraces = React.useMemo(() => {
    return traces.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.service.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [traces, search, statusFilter]);

  return (
    <Card className="border-[#1e293b] bg-black shadow-xl backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#1e293b] pb-4 px-6">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-base font-semibold text-slate-100">
              Live Trace Execution Logs
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400 mt-0.5">
            Real-time incoming agent spans, HTTP traces, and latency profile
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter trace ID or operation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-60 rounded-md border border-[#1e293b] bg-black pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center rounded-md border border-[#1e293b] bg-black p-0.5 text-xs">
            {(["all", "success", "error", "rate_limited"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st === "all" ? "All" : st === "rate_limited" ? "429 Rate" : st}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-[#1e293b] bg-black text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Trace ID</th>
                <th className="py-3 px-4 font-semibold">Operation / Span</th>
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Latency</th>
                <th className="py-3 px-4 font-semibold">CPU %</th>
                <th className="py-3 px-4 font-semibold">Model / Provider</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111e38]/70">
              {filteredTraces.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No matching traces found.
                  </td>
                </tr>
              ) : (
                filteredTraces.map((trace) => (
                  <tr
                    key={trace.id}
                    onClick={() => onSelectTrace(trace)}
                    className="group cursor-pointer hover:bg-blue-950/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-blue-400 font-semibold group-hover:underline">
                      {trace.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {trace.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="rounded bg-[#0c1527] px-2 py-0.5 border border-[#172554] text-[11px]">
                        {trace.service}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                          trace.status === "success"
                            ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                            : trace.status === "rate_limited"
                            ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                            : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                        }`}
                      >
                        {trace.status === "success" ? (
                          <CheckCircle2 className="h-3 w-3 text-blue-400" />
                        ) : (
                          <XCircle className="h-3 w-3 text-rose-400" />
                        )}
                        {trace.statusCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span
                        className={`font-semibold ${
                          trace.latencyMs > 1000
                            ? "text-rose-400"
                            : trace.latencyMs > 300
                            ? "text-blue-300"
                            : "text-blue-400"
                        }`}
                      >
                        {trace.latencyMs} ms
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-300">
                      {trace.cpuPercent}%
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {trace.model}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {trace.timestamp}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-blue-400 hover:text-white hover:bg-blue-600/30"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#1e293b] px-6 py-3 text-xs text-slate-400 bg-black">
          <span>Showing {filteredTraces.length} of {traces.length} recent traces</span>
          <div className="flex items-center gap-1 font-mono text-blue-400">
            <span>Click any trace row to open span breakdown inspector</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

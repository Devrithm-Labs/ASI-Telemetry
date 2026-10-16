"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Loader2,
  Search,
  Square,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { TraceRecord } from "./context/dashboard-types";
import { useDashboard } from "./context/dashboard-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TraceTableProps {
  traces: TraceRecord[];
  onSelectTrace: (trace: TraceRecord) => void;
}

interface DeleteTarget {
  type: "single" | "selected" | "all";
  traceId?: string;
  count: number;
}

export function TraceTable({ traces, onSelectTrace }: TraceTableProps) {
  const { deleteTraces, clearAllTraces } = useDashboard();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "success" | "error" | "rate_limited">("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

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

  const allFilteredSelected =
    filteredTraces.length > 0 &&
    filteredTraces.every((t) => selectedIds.has(t.id));

  const someFilteredSelected =
    filteredTraces.some((t) => selectedIds.has(t.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTraces.map((t) => t.id)));
    }
  };

  const handleToggleRow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const confirmDeleteSingle = (e: React.MouseEvent, traceId: string) => {
    e.stopPropagation();
    setDeleteTarget({
      type: "single",
      traceId,
      count: 1,
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteTarget({
      type: "selected",
      count: selectedIds.size,
    });
  };

  const confirmClearAll = () => {
    setDeleteTarget({
      type: "all",
      count: traces.length,
    });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "single" && deleteTarget.traceId) {
        await deleteTraces([deleteTarget.traceId]);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.traceId!);
          return next;
        });
      } else if (deleteTarget.type === "selected") {
        await deleteTraces(Array.from(selectedIds));
        setSelectedIds(new Set());
      } else if (deleteTarget.type === "all") {
        await clearAllTraces();
        setSelectedIds(new Set());
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Card className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-xl backdrop-blur-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-[#1e293b] pb-4 px-6 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Live Trace Execution Logs
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time incoming agent spans, HTTP traces, and latency profile
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter trace ID or operation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56 rounded-md border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-black pl-8 pr-3 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center rounded-md border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-black p-0.5 text-xs">
              {(["all", "success", "error", "rate_limited"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors select-none ${
                    statusFilter === st
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {st === "all" ? "All" : st === "rate_limited" ? "429 Rate" : st}
                </button>
              ))}
            </div>

            {/* Clear All Traces Button */}
            {traces.length > 0 && (
              <button
                type="button"
                onClick={confirmClearAll}
                title="Clear all tool traces from ClickHouse"
                className="flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:border-rose-500/60 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </CardHeader>

        {/* Selected Rows Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 px-6 py-2.5 text-xs transition-all">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                {selectedIds.size}
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {selectedIds.size === 1 ? "1 trace selected" : `${selectedIds.size} traces selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Deselect
              </button>
              <button
                type="button"
                onClick={confirmDeleteSelected}
                className="flex items-center gap-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-xs font-semibold shadow-sm transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 dark:border-[#1e293b] bg-slate-50/90 dark:bg-black text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="inline-flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title={allFilteredSelected ? "Deselect all" : "Select all visible"}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : someFilteredSelected ? (
                        <Square className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-blue-600/30" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 font-semibold">Trace ID</th>
                  <th className="py-3 px-4 font-semibold">Operation / Span</th>
                  <th className="py-3 px-4 font-semibold">Service</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Response Time</th>
                  <th className="py-3 px-4 font-semibold">Model / Provider</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-[#111e38]/70">
                {filteredTraces.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No matching traces found.
                    </td>
                  </tr>
                ) : (
                  filteredTraces.map((trace) => {
                    const isSelected = selectedIds.has(trace.id);
                    return (
                      <tr
                        key={trace.id}
                        onClick={() => onSelectTrace(trace)}
                        className={`group cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/60 dark:bg-blue-950/40"
                            : "hover:bg-slate-50/90 dark:hover:bg-blue-950/20"
                        }`}
                      >
                        {/* Row Selection Checkbox */}
                        <td
                          className="py-3 px-3 text-center"
                          onClick={(e) => handleToggleRow(e, trace.id)}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                          {trace.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200">
                          {trace.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          <span className="rounded bg-slate-100 dark:bg-[#0c1527] px-2 py-0.5 border border-slate-200 dark:border-[#172554] text-[11px] font-mono">
                            {trace.service}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                              trace.status === "success"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60"
                                : trace.status === "rate_limited"
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60"
                                : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60"
                            }`}
                          >
                            {trace.status === "success" ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-blue-400" />
                            ) : (
                              <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            )}
                            {trace.statusCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span
                            className={`font-semibold ${
                              trace.latencyMs > 1000
                                ? "text-rose-600 dark:text-rose-400"
                                : trace.latencyMs > 300
                                ? "text-amber-600 dark:text-blue-300"
                                : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {trace.latencyMs} ms
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {trace.model}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {trace.timestamp}
                        </td>

                        {/* Individual Delete Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            title="Delete trace"
                            onClick={(e) => confirmDeleteSingle(e, trace.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/85 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-black shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {deleteTarget.type === "single"
                    ? "Delete Trace Record"
                    : deleteTarget.type === "selected"
                    ? `Delete ${deleteTarget.count} Traces`
                    : "Clear All Tracing Data"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {deleteTarget.type === "single" && (
                    <>
                      Are you sure you want to permanently delete trace{" "}
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {deleteTarget.traceId}
                      </span>{" "}
                      from ClickHouse? This action cannot be undone.
                    </>
                  )}
                  {deleteTarget.type === "selected" && (
                    <>
                      Are you sure you want to permanently delete the{" "}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {deleteTarget.count} selected trace records
                      </span>{" "}
                      from ClickHouse? This action cannot be undone.
                    </>
                  )}
                  {deleteTarget.type === "all" && (
                    <>
                      Are you sure you want to clear{" "}
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        all {deleteTarget.count} traces
                      </span>{" "}
                      recorded in ClickHouse? This will truncate the telemetry table and reset all metrics.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-[#1e293b]">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="text-xs h-8 border-slate-200 dark:border-[#1e293b]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isDeleting}
                onClick={executeDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 font-semibold flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

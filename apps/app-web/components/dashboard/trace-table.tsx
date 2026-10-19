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

  const confirmDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget({ type: "single", traceId: id, count: 1 });
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteTarget({ type: "selected", count: selectedIds.size });
  };

  const confirmClearAll = () => {
    if (traces.length === 0) return;
    setDeleteTarget({ type: "all", count: traces.length });
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
      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 px-6 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base font-semibold text-foreground">
                Tool Tracing Logs
              </CardTitle>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter trace ID or operation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56 rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center rounded-md border border-input bg-muted/40 p-0.5 text-xs">
              {(["all", "success", "error", "rate_limited"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors select-none cursor-pointer ${
                    statusFilter === st
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st === "all" ? "All" : st === "rate_limited" ? "429 Rate" : st}
                </button>
              ))}
            </div>

            {/* Clear All Traces Button */}
            {traces.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={confirmClearAll}
                title="Clear all tool traces from ClickHouse"
                className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                <span>Clear All</span>
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Selected Rows Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-2 text-xs transition-all">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground font-mono text-[11px]">
                {selectedIds.size}
              </span>
              <span className="font-medium text-foreground">
                {selectedIds.size === 1 ? "1 trace selected" : `${selectedIds.size} traces selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-7 text-xs"
              >
                Deselect
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDeleteSelected}
                className="h-7 text-xs gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title={allFilteredSelected ? "Deselect all" : "Select all visible"}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="h-4 w-4 text-foreground" />
                      ) : someFilteredSelected ? (
                        <Square className="h-4 w-4 text-foreground fill-foreground/30" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-4 font-medium">Trace ID</th>
                  <th className="py-2.5 px-4 font-medium">Operation / Span</th>
                  <th className="py-2.5 px-4 font-medium">Service</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Response Time</th>
                  <th className="py-2.5 px-4 font-medium">Model / Provider</th>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTraces.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
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
                            ? "bg-muted"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {/* Row Selection Checkbox */}
                        <td
                          className="py-2.5 px-3 text-center"
                          onClick={(e) => handleToggleRow(e, trace.id)}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-foreground" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 px-4 font-mono font-medium text-foreground group-hover:underline">
                          {trace.id}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          {trace.name}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          <span className="rounded bg-muted border border-border px-2 py-0.5 text-[11px] font-mono">
                            {trace.service}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                              trace.status === "success"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : trace.status === "rate_limited"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border-destructive/20 bg-destructive/10 text-destructive"
                            }`}
                          >
                            {trace.status === "success" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {trace.statusCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-foreground">
                          {trace.latencyMs} ms
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {trace.model}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                          {trace.timestamp}
                        </td>

                        {/* Individual Delete Action */}
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            title="Delete trace"
                            onClick={(e) => confirmDeleteSingle(e, trace.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {deleteTarget.type === "single"
                    ? "Delete Trace Record"
                    : deleteTarget.type === "selected"
                    ? `Delete ${deleteTarget.count} Traces`
                    : "Clear All Tracing Data"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {deleteTarget.type === "single" && (
                    <>
                      Are you sure you want to permanently delete trace{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {deleteTarget.traceId}
                      </span>{" "}
                      from ClickHouse? This action cannot be undone.
                    </>
                  )}
                  {deleteTarget.type === "selected" && (
                    <>
                      Are you sure you want to permanently delete the{" "}
                      <span className="font-semibold text-foreground">
                        {deleteTarget.count} selected trace records
                      </span>{" "}
                      from ClickHouse? This action cannot be undone.
                    </>
                  )}
                  {deleteTarget.type === "all" && (
                    <>
                      Are you sure you want to clear{" "}
                      <span className="font-semibold text-destructive">
                        all {deleteTarget.count} traces
                      </span>{" "}
                      recorded in ClickHouse? This will truncate the telemetry table and reset all metrics.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={executeDelete}
                className="text-xs h-8 font-medium gap-1.5"
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

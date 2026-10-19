"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { TraceRecord } from "../context/dashboard-types";
import { useDashboard } from "../context/dashboard-context";
import { Button } from "@/components/ui/button";

interface TraceModalProps {
  trace: TraceRecord | null;
  open: boolean;
  onClose: () => void;
}

export function TraceModal({ trace, open, onClose }: TraceModalProps) {
  const { deleteTraces } = useDashboard();
  const [activeTab, setActiveTab] = React.useState<"waterfall" | "raw" | "error">("waterfall");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  if (!open || !trace) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTraces([trace.id]);
      onClose();
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const totalDuration = trace.spans.reduce((acc, s) => acc + s.durationMs, 0) || trace.responseTimeMs || trace.latencyMs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {trace.id}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                    trace.status === "success"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : trace.status === "rate_limited"
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-destructive/20 bg-destructive/10 text-destructive"
                  }`}
                >
                  {trace.statusCode} {trace.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mt-0.5">{trace.name}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Metric Badges Banner */}
        <div className="grid grid-cols-3 border-b border-border bg-muted/30 px-6 py-3 text-xs">
          <div>
            <span className="text-muted-foreground">Response Time:</span>
            <div className="font-mono font-semibold text-foreground mt-0.5">
              {trace.responseTimeMs || trace.latencyMs} ms
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Model / Engine:</span>
            <div className="font-medium text-foreground truncate mt-0.5">
              {trace.model}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Tokens Generated:</span>
            <div className="font-mono font-semibold text-foreground mt-0.5">
              {trace.tokens > 0 ? trace.tokens.toLocaleString() : "N/A"}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border px-6 bg-card gap-4">
          <button
            onClick={() => setActiveTab("waterfall")}
            className={`py-2.5 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
              activeTab === "waterfall"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Span Execution Waterfall ({trace.spans.length})
          </button>
          {trace.errorMessage && (
            <button
              onClick={() => setActiveTab("error")}
              className={`py-2.5 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
                activeTab === "error"
                  ? "border-destructive text-destructive font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Error Diagnostic
            </button>
          )}
          <button
            onClick={() => setActiveTab("raw")}
            className={`py-2.5 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
              activeTab === "raw"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Raw OpenTelemetry Payload
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "waterfall" && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Sub-Span Timeline Breakdown</span>
                <span className="font-mono text-foreground font-medium">Total Span Time: {totalDuration} ms</span>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                {trace.spans.map((span, idx) => {
                  const widthPercent = Math.max(
                    8,
                    Math.min(100, (span.durationMs / totalDuration) * 100)
                  );

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {span.status === "ok" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          <span className="font-mono text-foreground">{span.name}</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {span.durationMs} ms
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded transition-all ${
                            span.status === "ok"
                              ? "bg-foreground"
                              : "bg-destructive"
                          }`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "error" && trace.errorMessage && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Execution Fault Diagnostic</span>
              </div>
              <p className="font-mono text-xs text-foreground leading-relaxed bg-background p-3 rounded-md border border-border">
                {trace.errorMessage}
              </p>
              <div className="text-[11px] text-muted-foreground pt-1">
                Suggested Remediation: Check downstream service timeout quota or configure exponential backoff retry policy in telemetry agent.
              </div>
            </div>
          )}

          {activeTab === "raw" && (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <pre className="font-mono text-xs text-foreground overflow-x-auto">
                {JSON.stringify(trace, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-6 py-3 bg-muted/30">
          <span className="text-[11px] text-muted-foreground">
            Recorded at {trace.timestamp} • Service: {trace.service}
          </span>
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-md px-2.5 py-1">
                <span className="text-xs text-destructive font-medium">Delete permanently?</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setConfirmDelete(false)}
                  className="h-7 px-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="h-7 px-2.5 text-xs font-medium flex items-center gap-1"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  <span>Delete</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Trace</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={onClose}
              className="text-xs font-medium"
            >
              Close Inspector
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

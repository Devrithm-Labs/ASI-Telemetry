"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  FileJson,
  Layers,
  Terminal,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { TraceRecord } from "./dashboard-types";
import { Button } from "@/components/ui/button";

interface TraceModalProps {
  trace: TraceRecord | null;
  open: boolean;
  onClose: () => void;
}

export function TraceModal({ trace, open, onClose }: TraceModalProps) {
  const [activeTab, setActiveTab] = React.useState<"waterfall" | "raw" | "error">("waterfall");

  if (!open || !trace) return null;

  const totalDuration = trace.spans.reduce((acc, s) => acc + s.durationMs, 0) || trace.latencyMs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-[#1e293b] bg-black shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] px-6 py-4 bg-black">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-600/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-blue-400">
                  {trace.id}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    trace.status === "success"
                      ? "border border-blue-500/30 bg-blue-950/60 text-blue-300"
                      : trace.status === "rate_limited"
                      ? "border border-amber-500/30 bg-amber-950/60 text-amber-300"
                      : "border border-rose-500/30 bg-rose-950/60 text-rose-300"
                  }`}
                >
                  {trace.statusCode} {trace.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100">{trace.name}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#171717] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metric Badges Banner */}
        <div className="grid grid-cols-4 border-b border-[#1e293b] bg-black px-6 py-3 text-xs">
          <div>
            <span className="text-slate-400">Duration:</span>
            <div className="font-mono font-semibold text-slate-200 mt-0.5">
              {trace.latencyMs} ms
            </div>
          </div>
          <div>
            <span className="text-slate-400">CPU Impact:</span>
            <div className="font-mono font-semibold text-blue-400 mt-0.5">
              {trace.cpuPercent}%
            </div>
          </div>
          <div>
            <span className="text-slate-400">Model / Engine:</span>
            <div className="font-medium text-slate-200 truncate mt-0.5">
              {trace.model}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Tokens Generated:</span>
            <div className="font-mono font-semibold text-slate-200 mt-0.5">
              {trace.tokens > 0 ? trace.tokens.toLocaleString() : "N/A"}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1e293b] px-6 bg-black gap-4">
          <button
            onClick={() => setActiveTab("waterfall")}
            className={`py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === "waterfall"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Span Execution Waterfall ({trace.spans.length})
          </button>
          {trace.errorMessage && (
            <button
              onClick={() => setActiveTab("error")}
              className={`py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                activeTab === "error"
                  ? "border-rose-500 text-rose-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Error Diagnostic
            </button>
          )}
          <button
            onClick={() => setActiveTab("raw")}
            className={`py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === "raw"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Raw OpenTelemetry Payload
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "waterfall" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Sub-Span Timeline Breakdown</span>
                <span>Total Span Time: {totalDuration} ms</span>
              </div>

              <div className="space-y-2 rounded-lg border border-[#172554] bg-[#030712] p-3">
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
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-400" />
                          )}
                          <span className="font-mono text-slate-200">{span.name}</span>
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                          {span.durationMs} ms
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="h-2 w-full rounded bg-[#0c1527] overflow-hidden">
                        <div
                          className={`h-full rounded transition-all ${
                            span.status === "ok"
                              ? "bg-gradient-to-r from-blue-600 to-blue-400"
                              : "bg-rose-500"
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
            <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>Execution Fault Diagnostic</span>
              </div>
              <p className="font-mono text-xs text-rose-200/90 leading-relaxed bg-black p-3 rounded border border-rose-900/40">
                {trace.errorMessage}
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                Suggested Remediation: Check downstream service timeout quota or configure exponential backoff retry policy in telemetry agent.
              </div>
            </div>
          )}

          {activeTab === "raw" && (
            <div className="rounded-lg border border-[#1e293b] bg-black p-3">
              <pre className="font-mono text-xs text-blue-300 overflow-x-auto">
                {JSON.stringify(trace, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1e293b] px-6 py-3 bg-black">
          <span className="text-[11px] text-slate-500">
            Recorded at {trace.timestamp} • Service: {trace.service}
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
}

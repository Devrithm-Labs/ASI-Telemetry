"use client";

import * as React from "react";
import { Activity, CheckCircle2, Clock, Cpu, RefreshCw, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricRecord {
  id: string;
  timestamp: string;
  agent_name: string;
  func_name: string;
  status: string;
  latency_ms: number;
  cpu_before: number;
  cpu_after: number;
  memory_before: number;
  memory_after: number;
  request_count: number;
  success_count: number;
  error_count: number;
}

interface MetricSummary {
  total_requests: number;
  total_success: number;
  total_errors: number;
  avg_latency_ms: number;
  current_cpu: number;
  current_memory: number;
}

export function DatabaseTelemetry() {
  const [metrics, setMetrics] = React.useState<MetricRecord[]>([]);
  const [summary, setSummary] = React.useState<MetricSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Simple useEffect hook to fetch ClickHouse database data from FastAPI backend
  React.useEffect(() => {
    let isMounted = true;

    async function loadDatabaseData() {
      try {
        // 1. Fetch recent telemetry records from ClickHouse
        const res = await fetch("http://localhost:8080/api/metrics");
        if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
        const data = await res.json();

        // 2. Fetch summary statistics
        const summaryRes = await fetch("http://localhost:8080/api/metrics/summary");
        const summaryData = await summaryRes.json();

        if (isMounted) {
          setMetrics(data.data || []);
          setSummary(summaryData);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to connect to backend on port 8080");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    // Initial fetch on mount
    loadDatabaseData();

    // Auto-refresh every 3 seconds to show new agent metrics live
    const interval = setInterval(loadDatabaseData, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              ClickHouse Database Telemetry
            </h2>
            <p className="text-xs text-slate-400">
              Live SDK metrics saved with timestamps in ClickHouse Cloud
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync ({metrics.length} records)
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-[#1e293b] bg-[#090d16] p-3.5">
          <div className="text-[11px] font-medium uppercase text-slate-400">Total Requests</div>
          <div className="mt-1 text-xl font-bold font-mono text-white">
            {summary ? summary.total_requests : metrics.length}
          </div>
        </Card>

        <Card className="border-[#1e293b] bg-[#090d16] p-3.5">
          <div className="text-[11px] font-medium uppercase text-slate-400">Success Rate</div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-400">
            {summary && summary.total_requests > 0
              ? `${((summary.total_success / summary.total_requests) * 100).toFixed(0)}%`
              : "100%"}
          </div>
        </Card>

        <Card className="border-[#1e293b] bg-[#090d16] p-3.5">
          <div className="text-[11px] font-medium uppercase text-slate-400">Avg Latency</div>
          <div className="mt-1 text-xl font-bold font-mono text-blue-400">
            {summary ? summary.avg_latency_ms.toFixed(1) : 0} ms
          </div>
        </Card>

        <Card className="border-[#1e293b] bg-[#090d16] p-3.5">
          <div className="text-[11px] font-medium uppercase text-slate-400">Latest CPU / RAM</div>
          <div className="mt-1 text-xl font-bold font-mono text-amber-400">
            {summary ? `${summary.current_cpu}% / ${summary.current_memory}%` : "0% / 0%"}
          </div>
        </Card>
      </div>

      {/* Error Notice if Backend is Offline */}
      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          ⚠️ Could not reach backend: {error}. Make sure `python run.py` is running on port 8080.
        </div>
      )}

      {/* Telemetry Data Table */}
      <div className="rounded-lg border border-[#1e293b] bg-[#060910] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1e293b] bg-[#090d16] text-slate-400 font-medium">
              <tr>
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Agent Name</th>
                <th className="py-2.5 px-4">Function</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Latency</th>
                <th className="py-2.5 px-4">CPU %</th>
                <th className="py-2.5 px-4">RAM %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] font-mono text-slate-200">
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    {isLoading ? "Loading telemetry records..." : "No records found in ClickHouse yet. Run your agent script to see live metrics appear here!"}
                  </td>
                </tr>
              ) : (
                metrics.map((row) => (
                  <tr key={row.id} className="hover:bg-[#0b101e] transition-colors">
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {row.timestamp ? row.timestamp.replace("T", " ").substring(0, 19) : "—"}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-white font-sans">
                      {row.agent_name}
                    </td>
                    <td className="py-2.5 px-4 text-indigo-300">
                      {row.func_name}
                    </td>
                    <td className="py-2.5 px-4">
                      {row.status === "success" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          SUCCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                          <XCircle className="h-3 w-3" />
                          ERROR
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-blue-300 font-semibold">
                      {row.latency_ms} ms
                    </td>
                    <td className="py-2.5 px-4 text-amber-300">
                      {row.cpu_before}% &rarr; {row.cpu_after}%
                    </td>
                    <td className="py-2.5 px-4 text-emerald-300">
                      {row.memory_before}% &rarr; {row.memory_after}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

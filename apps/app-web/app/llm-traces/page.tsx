"use client";

import * as React from "react";
import {
  AlertCircle,
  BarChart2,
  Bot,
  Check,
  Clock,
  Copy,
  Download,
  GitFork,
  GitMerge,
  Link2,
  PanelRightClose,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LLMTraceItem {
  id: string;
  trace_id: string;
  span_id: string;
  parent_id?: string | null;
  name: string;
  run_type: string;
  status: "success" | "error";
  model: string;
  input: string;
  output?: string | null;
  error?: string | null;
  start_time: string;
  end_time?: string | null;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  metadata?: Record<string, any>;
}

export default function LLMTracingPage() {
  const [traces, setTraces] = React.useState<LLMTraceItem[]>([]);
  // Closed by default!
  const [selectedTrace, setSelectedTrace] = React.useState<LLMTraceItem | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "success" | "error">("all");
  const [traceTypeFilter, setTraceTypeFilter] = React.useState<"all" | "collective" | "standalone">("all");
  const [hoveredTraceId, setHoveredTraceId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Live ClickHouse traces only
  const allTraces = traces;

  // Fetch traces from ClickHouse API
  const fetchTraces = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("limit", "100");

      const res = await fetch(`http://127.0.0.1:8080/api/llm/traces?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const realTraces: LLMTraceItem[] = data.traces || [];
        setTraces(realTraces);
        // Keep sidebar closed by default
        setSelectedTrace((current) => {
          if (!current) return null;
          return realTraces.find((t) => t.id === current.id) || null;
        });
      }
    } catch (err) {
      console.error("Failed to fetch LLM traces:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Connect WebSocket for live streaming
  React.useEffect(() => {
    fetchTraces();

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("ws://127.0.0.1:8080/ws/telemetry");
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "llm_trace_received" && msg.trace) {
            const newTrace: LLMTraceItem = msg.trace;
            setTraces((prev) => [newTrace, ...prev.filter((t) => t.id !== newTrace.id)]);
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Offline fallback
    }

    return () => {
      if (ws) ws.close();
    };
  }, [fetchTraces]);

  const handleClearTraces = async () => {
    if (!confirm("Are you sure you want to clear all LLM traces from ClickHouse?")) return;
    try {
      const res = await fetch("http://127.0.0.1:8080/api/llm/traces", { method: "DELETE" });
      if (res.ok) {
        setTraces([]);
        setSelectedTrace(null);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Failed to clear traces:", err);
    }
  };

  // Filter traces
  const filteredTraces = React.useMemo(() => {
    return allTraces.filter((t) => {
      const matchSearch =
        !searchQuery ||
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.input?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.output?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.error?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.trace_id?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allTraces, searchQuery, statusFilter]);

  // Group traces by trace_id to identify collective multi-agent calls
  const traceGroups = React.useMemo(() => {
    const map = new Map<string, LLMTraceItem[]>();
    filteredTraces.forEach((t) => {
      const tid = t.trace_id || t.id;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(t);
    });
    // Ensure every group is sorted by start_time ascending (Hop 1 at top -> downstream hops)
    map.forEach((items) => {
      items.sort(
        (a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
      );
    });
    return map;
  }, [filteredTraces]);

  // Cluster traces so collective hops sharing trace_id remain adjacent in sequence
  const clusteredTraces = React.useMemo(() => {
    const sortedGroups = Array.from(traceGroups.entries()).sort(([, a], [, b]) => {
      const timeA = Math.max(...a.map((t) => new Date(t.start_time || 0).getTime()));
      const timeB = Math.max(...b.map((t) => new Date(t.start_time || 0).getTime()));
      return timeB - timeA;
    });

    const list: LLMTraceItem[] = [];
    sortedGroups.forEach(([, group]) => {
      const isCollective = group.length > 1;
      if (traceTypeFilter === "collective" && !isCollective) return;
      if (traceTypeFilter === "standalone" && isCollective) return;

      list.push(...group);
    });
    return list;
  }, [traceGroups, traceTypeFilter]);

  const collectiveCount = React.useMemo(() => {
    return Array.from(traceGroups.values()).filter((g) => g.length > 1).length;
  }, [traceGroups]);

  const standaloneCount = React.useMemo(() => {
    return Array.from(traceGroups.values()).filter((g) => g.length === 1).length;
  }, [traceGroups]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(clusteredTraces.map((t) => t.id)) : new Set());
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatLatency = (ms: number) => {
    if (!ms) return "0ms";
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`;
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0c10] text-[#e2e8f0] font-sans overflow-hidden select-none">
      {/* 1. Header Bar */}
      <div className="flex h-12 items-center justify-between border-b border-[#1b2230] bg-[#0c0e14] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-tr from-cyan-500 to-blue-600 text-[10px] font-bold text-white shadow-sm">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">devrithm</span>
          <span className="rounded bg-[#1a2333] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
            ID
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTraces()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded border border-[#212b3d] bg-[#121620] px-2.5 py-1 text-xs text-slate-300 hover:border-blue-500/50 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {traces.length > 0 && (
            <button
              onClick={handleClearTraces}
              title="Clear all ClickHouse LLM traces"
              className="flex items-center gap-1 rounded border border-[#212b3d] bg-[#121620] px-2.5 py-1 text-xs text-rose-400 hover:border-rose-500/50 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="flex flex-wrap h-auto min-h-11 items-center justify-between gap-3 border-b border-[#1b2230] bg-[#0c0e14] px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box - Dedicated width, no squishing */}
          <div className="relative w-64 min-w-[200px]">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search traces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7.5 w-full rounded-md border border-[#212b3d] bg-[#111622] pl-8 pr-7 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center rounded-md border border-[#212b3d] bg-[#0b0c10] p-0.5 text-xs">
            {(["all", "success", "error"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded px-2.5 py-0.5 text-[11px] capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-blue-950 text-blue-300 font-semibold border border-blue-800/60"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Collective / Standalone filter */}
          <div className="flex items-center rounded-md border border-[#212b3d] bg-[#0b0c10] p-0.5 text-xs">
            <button
              onClick={() => setTraceTypeFilter("all")}
              className={`rounded px-2.5 py-0.5 text-[11px] transition-colors ${
                traceTypeFilter === "all"
                  ? "bg-blue-950 text-blue-300 font-semibold border border-blue-800/60"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTraceTypeFilter("collective")}
              className={`rounded px-2.5 py-0.5 text-[11px] transition-colors flex items-center gap-1 ${
                traceTypeFilter === "collective"
                  ? "bg-blue-950 text-blue-300 font-semibold border border-blue-800/60"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Link2 className="h-2.5 w-2.5 text-blue-400" />
              <span>Chains ({collectiveCount})</span>
            </button>
            <button
              onClick={() => setTraceTypeFilter("standalone")}
              className={`rounded px-2.5 py-0.5 text-[11px] transition-colors ${
                traceTypeFilter === "standalone"
                  ? "bg-blue-950 text-blue-300 font-semibold border border-blue-800/60"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Standalone ({standaloneCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded border border-[#212b3d] bg-[#111622] px-2.5 py-1 text-xs text-slate-300">
          <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
          <span>Total Number Traces · <strong className="text-white font-mono">{filteredTraces.length}</strong></span>
        </div>
      </div>

      {/* 3. Table & Detail Panel */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-auto bg-[#0b0c10]">
          <table className="w-full border-collapse text-left text-xs text-slate-300">
            <thead className="sticky top-0 z-20 border-b border-[#1b2230] bg-[#0c0e14] text-[11px] font-medium text-slate-400 select-none">
              <tr>
                {/* 1. Unified Lineage Tree & Checkbox Column Header */}
                <th className="w-14 px-2 py-2 text-right">
                  <input
                    type="checkbox"
                    checked={clusteredTraces.length > 0 && selectedIds.size === clusteredTraces.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-[#121620] text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="w-16 px-2 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Input</th>
                <th className="px-3 py-2 font-medium">Output</th>
                <th className="px-3 py-2 font-medium">Error</th>
                <th className="px-3 py-2 font-medium">Start Time</th>
                <th className="px-3 py-2 font-medium">Latency</th>
                <th className="px-3 py-2 font-medium">Tokens / Cost</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#161d2d]">
              {clusteredTraces.map((trace) => {
                const isSelected = selectedTrace?.id === trace.id;
                const isChecked = selectedIds.has(trace.id);
                const isSlow = trace.latency_ms >= 30000;

                // Multi-agent lineage calculations
                const group = traceGroups.get(trace.trace_id || trace.id) || [trace];
                const isCollective = group.length > 1;
                const indexInGroup = group.findIndex((t) => t.id === trace.id);
                const isFirst = indexInGroup === 0;
                const isLast = indexInGroup === group.length - 1;
                const isMiddle = !isFirst && !isLast;
                const isHovered = hoveredTraceId === (trace.trace_id || trace.id);

                return (
                  <tr
                    key={trace.id}
                    onClick={() => setSelectedTrace(trace)}
                    onMouseEnter={() => isCollective && setHoveredTraceId(trace.trace_id || trace.id)}
                    onMouseLeave={() => isCollective && setHoveredTraceId(null)}
                    className={`group cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#131b29] hover:bg-[#162030]"
                        : isCollective && isHovered
                        ? "bg-[#0e1728] hover:bg-[#121d30]"
                        : "hover:bg-[#0f141f]"
                    }`}
                  >
                    {/* Unified Tree Connector & Checkbox Column (Connected directly like ├── [ ]) */}
                    <td
                      className="w-14 px-0 py-0 relative select-none align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative w-full h-full min-h-[46px] flex items-center justify-end pr-2.5">
                        {isCollective ? (
                          <>
                            {/* Vertical tree trunk line */}
                            <div
                              className={cn(
                                "absolute left-[13px] w-[2px] transition-colors pointer-events-none",
                                isFirst && "top-1/2 bottom-0",
                                isMiddle && "top-0 bottom-0",
                                isLast && "top-0 bottom-1/2",
                                isHovered ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" : "bg-blue-500"
                              )}
                            />

                            {/* Horizontal branch tine connecting trunk directly into checkbox */}
                            <div
                              className={cn(
                                "absolute left-[13px] top-1/2 -translate-y-1/2 w-4 h-[2px] transition-colors pointer-events-none",
                                isHovered ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" : "bg-blue-500"
                              )}
                            />

                            {/* Glowing junction node dot */}
                            <div
                              title={`Collective Multi-Agent Trace #${(trace.trace_id || trace.id).slice(0, 14)} (Hop ${indexInGroup + 1} of ${group.length})`}
                              className={cn(
                                "absolute left-[14px] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-2.5 w-2.5 rounded-full border-2 transition-all duration-150 cursor-pointer",
                                isHovered
                                  ? "border-white bg-sky-300 scale-125 shadow-[0_0_10px_rgba(56,189,248,1)]"
                                  : "border-[#0b0c10] bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                              )}
                            />
                          </>
                        ) : (
                          /* Standalone subtle marker dot */
                          <div
                            title={`Standalone Trace #${(trace.trace_id || trace.id).slice(0, 14)}`}
                            className="absolute left-[14px] top-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-slate-600/70"
                          />
                        )}

                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(trace.id)}
                          className="relative z-10 h-3.5 w-3.5 rounded border-slate-700 bg-[#121620] text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    </td>

                    <td className="px-2 py-2.5 text-center font-mono text-[11px]">
                      {trace.status === "success" ? (
                        <span className="rounded bg-emerald-950/40 px-1.5 py-0.5 text-emerald-400 border border-emerald-800/40">
                          success
                        </span>
                      ) : (
                        <span className="rounded bg-rose-950/40 px-1.5 py-0.5 text-rose-400 border border-rose-800/40">
                          failed
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 font-mono font-medium text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isCollective && (
                          <span className="rounded bg-blue-950/80 border border-blue-800/60 px-1 py-0.2 text-[9px] font-mono text-blue-300 font-semibold">
                            Hop {indexInGroup + 1}
                          </span>
                        )}
                        <span>{trace.name}</span>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 max-w-[200px] truncate text-slate-400">
                      {trace.input || <span className="text-slate-600">-</span>}
                    </td>

                    <td className="px-3 py-2.5 max-w-[260px] truncate font-mono text-[11px] text-slate-300">
                      {trace.output || <span className="text-slate-600">-</span>}
                    </td>

                    <td className="px-3 py-2.5 max-w-[220px] truncate font-mono text-[11px] text-rose-400">
                      {trace.error ? <span title={trace.error}>{trace.error}</span> : <span className="text-slate-600">-</span>}
                    </td>

                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {formatTime(trace.start_time)}
                    </td>

                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                          trace.status === "error"
                            ? "bg-rose-950/40 text-rose-400 border border-rose-800/40"
                            : isSlow
                            ? "bg-amber-950/40 text-amber-300 border border-amber-800/40"
                            : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                        }`}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        <span>{formatLatency(trace.latency_ms)}</span>
                      </span>
                    </td>

                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-300">
                          {(trace.total_tokens || 0).toLocaleString()} token
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-emerald-400 font-semibold">
                          ${(trace.cost_usd || 0).toFixed(6)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {clusteredTraces.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <Bot className="h-10 w-10 mx-auto mb-3 text-slate-600 opacity-60" />
                    <p className="font-medium text-slate-300 text-sm">No ClickHouse LLM Traces Found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Send a message to your agent or run <code className="text-blue-400 bg-slate-900 px-1 py-0.5 rounded">python apps/testing/src/agent_swarm.py</code> to see incoming collective traces.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Slide-Over Detail Panel */}
        {selectedTrace && (
          <div className="w-[480px] shrink-0 border-l border-[#1b2230] bg-[#0c0e14] flex flex-col h-full z-10 shadow-2xl">
            <div className="flex h-12 items-center justify-between border-b border-[#1b2230] px-4">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-mono font-semibold text-sm text-white truncate">
                  {selectedTrace.name}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    selectedTrace.status === "success"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {selectedTrace.status}
                </span>
                <span className="rounded bg-[#1a2333] px-1.5 py-0.5 font-mono text-[10px] text-blue-300">
                  {selectedTrace.model}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedTrace, null, 2), selectedTrace.id)}
                  title="Copy JSON representation"
                  className="rounded p-1 text-slate-400 hover:bg-[#1a2333] hover:text-white"
                >
                  {copiedId === selectedTrace.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedTrace(null)}
                  className="rounded p-1 text-slate-400 hover:bg-[#1a2333] hover:text-white"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-[#1b2230] bg-[#090a0f] p-3 text-center text-xs">
              <div>
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Latency</div>
                <div className="font-mono font-bold text-slate-200 mt-0.5">
                  {formatLatency(selectedTrace.latency_ms)}
                </div>
              </div>
              <div className="border-x border-[#1b2230]">
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Total Tokens</div>
                <div className="font-mono font-bold text-blue-300 mt-0.5">
                  {(selectedTrace.total_tokens || 0).toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-500">
                  {selectedTrace.prompt_tokens || 0} in / {selectedTrace.completion_tokens || 0} out
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Cost</div>
                <div className="font-mono font-bold text-emerald-400 mt-0.5">
                  ${(selectedTrace.cost_usd || 0).toFixed(6)}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-blue-400" />
                    <span>Prompt / Input</span>
                  </span>
                  <button
                    onClick={() => handleCopy(selectedTrace.input || "", "in")}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Copy
                  </button>
                </div>
                <div className="rounded-md border border-[#212b3d] bg-[#07080c] p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedTrace.input || "(No input recorded)"}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Completion / Output</span>
                  </span>
                  {selectedTrace.output && (
                    <button
                      onClick={() => handleCopy(selectedTrace.output || "", "out")}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Copy
                    </button>
                  )}
                </div>
                {selectedTrace.output ? (
                  <div className="rounded-md border border-[#212b3d] bg-[#07080c] p-3 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {selectedTrace.output}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-[#212b3d] p-3 text-center text-xs text-slate-600">
                    No output generated
                  </div>
                )}
              </div>

              {selectedTrace.error && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Execution Error</span>
                  </div>
                  <div className="rounded-md border border-rose-900/60 bg-rose-950/20 p-3 font-mono text-xs text-rose-300 whitespace-pre-wrap leading-relaxed">
                    {selectedTrace.error}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-slate-400">Run Metadata</span>
                <div className="rounded-md border border-[#212b3d] bg-[#07080c] p-2.5 font-mono text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Call Type:</span>
                    {(traceGroups.get(selectedTrace.trace_id || selectedTrace.id) || []).length > 1 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-950/70 border border-blue-800/60 px-1.5 py-0.5 text-[10px] text-blue-300 font-semibold">
                        <Link2 className="h-2.5 w-2.5 text-blue-400" />
                        <span>Collective Chain ({(traceGroups.get(selectedTrace.trace_id || selectedTrace.id) || []).length} Hops)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Standalone Call</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trace ID:</span>
                    <span className="text-slate-300">{selectedTrace.trace_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Span ID:</span>
                    <span className="text-slate-300">{selectedTrace.span_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Run Type:</span>
                    <span className="text-blue-300 font-semibold">{selectedTrace.run_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model:</span>
                    <span className="text-slate-300">{selectedTrace.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="text-slate-300">{formatTime(selectedTrace.start_time)}</span>
                  </div>

                  {/* Connected Hops in this Collective Call */}
                  {(traceGroups.get(selectedTrace.trace_id || selectedTrace.id) || []).length > 1 && (
                    <div className="mt-2 pt-2 border-t border-[#1b2230]">
                      <span className="text-slate-500 block mb-1 text-[10px] uppercase font-semibold">
                        Connected Hops in this Chain:
                      </span>
                      <div className="space-y-1">
                        {(traceGroups.get(selectedTrace.trace_id || selectedTrace.id) || []).map((hop, hIdx) => {
                          const isCurrent = hop.id === selectedTrace.id;
                          return (
                            <button
                              key={hop.id}
                              onClick={() => setSelectedTrace(hop)}
                              className={cn(
                                "w-full flex items-center justify-between px-2 py-1 rounded text-[10px] transition-colors text-left",
                                isCurrent
                                  ? "bg-blue-600/30 border border-blue-500/50 text-white font-semibold"
                                  : "bg-[#090d16] hover:bg-[#111827] text-slate-400 hover:text-slate-200"
                              )}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-mono text-blue-400">Hop {hIdx + 1}:</span>
                                <span className="truncate">{hop.name}</span>
                              </div>
                              <span className="font-mono text-slate-500">{formatLatency(hop.latency_ms)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedTrace.metadata && Object.keys(selectedTrace.metadata).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#1b2230]">
                      <span className="text-slate-500 block mb-1">Custom Attributes:</span>
                      <pre className="text-[10px] text-slate-400 overflow-x-auto">
                        {typeof selectedTrace.metadata === "string"
                          ? selectedTrace.metadata
                          : JSON.stringify(selectedTrace.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[#1b2230] bg-[#0c0e14] p-3 flex items-center justify-end">
              <button
                onClick={() => handleCopy(JSON.stringify(selectedTrace, null, 2), selectedTrace.id)}
                className="flex items-center gap-1.5 rounded border border-[#212b3d] bg-[#111622] px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [runTypeFilter, setRunTypeFilter] = React.useState<"all" | "llm" | "tool">("all");
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

  // Fetch traces on mount and when filters change
  React.useEffect(() => {
    fetchTraces();
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
      const matchRunType = runTypeFilter === "all" || (t.run_type || "llm").toLowerCase() === runTypeFilter;
      return matchSearch && matchStatus && matchRunType;
    });
  }, [allTraces, searchQuery, statusFilter, runTypeFilter]);

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
    <div className="flex h-full w-full flex-col bg-background text-foreground font-sans overflow-hidden select-none">
      {/* 1. Header Bar */}
      <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] font-bold text-white shadow-sm">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">devrithm</span>
          <span className="rounded bg-muted border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-500">
            ASI:LLM
          </span>
        </div>

        <div className="flex items-center gap-2">
          {traces.length > 0 && (
            <button
              onClick={handleClearTraces}
              title="Clear all ClickHouse LLM traces"
              className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-500 hover:border-rose-500/60 hover:text-rose-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="flex flex-wrap h-auto min-h-11 items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-md px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box - Dedicated width, no squishing */}
          <div className="relative w-64 min-w-[200px]">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search traces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7.5 w-full rounded-md border border-border bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
            {(["all", "success", "error"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded px-2.5 py-0.5 text-[11px] capitalize transition-all ${
                  statusFilter === st
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Run Type filter: All / LLM / Tool */}
          <div className="flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
            {(["all", "llm", "tool"] as const).map((rt) => (
              <button
                key={rt}
                onClick={() => setRunTypeFilter(rt)}
                className={`rounded px-2.5 py-0.5 text-[11px] uppercase transition-all flex items-center gap-1 ${
                  runTypeFilter === rt
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {rt === "llm" && <Sparkles className="h-2.5 w-2.5" />}
                {rt === "tool" && <Terminal className="h-2.5 w-2.5" />}
                <span>{rt === "all" ? "All Runs" : rt}</span>
              </button>
            ))}
          </div>

          {/* Collective / Standalone filter */}
          <div className="flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
            <button
              onClick={() => setTraceTypeFilter("all")}
              className={`rounded px-2.5 py-0.5 text-[11px] transition-all ${
                traceTypeFilter === "all"
                  ? "bg-blue-600 text-white font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTraceTypeFilter("collective")}
              className={`rounded px-2.5 py-0.5 text-[11px] transition-all flex items-center gap-1 ${
                traceTypeFilter === "collective"
                  ? "bg-blue-600 text-white font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 className="h-2.5 w-2.5 text-blue-500" />
              <span>Chains ({collectiveCount})</span>
            </button>
            <button
              onClick={() => setTraceTypeFilter("standalone")}
              className={`rounded px-2.5 py-0.5 text-[11px] transition-all ${
                traceTypeFilter === "standalone"
                  ? "bg-blue-600 text-white font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Standalone ({standaloneCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          <BarChart2 className="h-3.5 w-3.5 text-blue-500" />
          <span>Total Number Traces · <strong className="text-foreground font-mono">{filteredTraces.length}</strong></span>
        </div>
      </div>

      {/* 3. Table & Detail Panel */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-auto bg-background">
          <table className="w-full border-collapse text-left text-xs text-muted-foreground">
            <thead className="sticky top-0 z-20 border-b border-border bg-card text-[11px] font-semibold text-muted-foreground select-none">
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
                <th className="w-20 px-2 py-2 text-center font-medium">Run Type</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Input</th>
                <th className="px-3 py-2 font-medium">Output</th>
                <th className="px-3 py-2 font-medium">Error</th>
                <th className="px-3 py-2 font-medium">Start Time</th>
                <th className="px-3 py-2 font-medium">Latency</th>
                <th className="px-3 py-2 font-medium">Tokens / Cost</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
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
                        ? "bg-blue-500/10 hover:bg-blue-500/15"
                        : isCollective && isHovered
                        ? "bg-blue-500/5 hover:bg-blue-500/10"
                        : "hover:bg-muted/40"
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
                                isHovered ? "bg-sky-400" : "bg-blue-500"
                              )}
                            />

                            {/* Horizontal branch tine connecting trunk directly into checkbox */}
                            <div
                              className={cn(
                                "absolute left-[13px] top-1/2 -translate-y-1/2 w-4 h-[2px] transition-colors pointer-events-none",
                                isHovered ? "bg-sky-400" : "bg-blue-500"
                              )}
                            />

                            {/* Glowing junction node dot */}
                            <div
                              title={`Collective Multi-Agent Trace #${(trace.trace_id || trace.id).slice(0, 14)} (Hop ${indexInGroup + 1} of ${group.length})`}
                              className={cn(
                                "absolute left-[14px] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-2.5 w-2.5 rounded-full border-2 transition-all duration-150 cursor-pointer",
                                isHovered
                                  ? "border-white bg-sky-300 scale-125 shadow-sm"
                                  : "border-card bg-blue-500"
                              )}
                            />
                          </>
                        ) : (
                          /* Standalone subtle marker dot */
                          <div
                            title={`Standalone Trace #${(trace.trace_id || trace.id).slice(0, 14)}`}
                            className="absolute left-[14px] top-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
                          />
                        )}

                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(trace.id)}
                          className="relative z-10 h-3.5 w-3.5 rounded border-border bg-background text-blue-600 focus:ring-0 cursor-pointer"
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

                    {/* Run Type Badge (Distinguish LLM vs Tool calling) */}
                    <td className="px-2 py-2.5 text-center font-mono text-[11px] whitespace-nowrap">
                      {trace.run_type === "tool" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-amber-500 border border-amber-500/20 font-semibold text-[10px] uppercase">
                          <Terminal className="h-3 w-3" />
                          <span>tool</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-purple-400 border border-purple-500/20 font-semibold text-[10px] uppercase">
                          <Sparkles className="h-3 w-3" />
                          <span>llm</span>
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
                  <td colSpan={10} className="py-16 text-center text-slate-500">
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
          <div className="w-[480px] shrink-0 border-l border-border bg-card flex flex-col h-full z-10 shadow-2xl">
            <div className="flex h-12 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-mono font-semibold text-sm text-foreground truncate">
                  {selectedTrace.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    selectedTrace.run_type === "tool"
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  }`}
                >
                  {selectedTrace.run_type === "tool" ? <Terminal className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
                  <span>{selectedTrace.run_type || "llm"}</span>
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    selectedTrace.status === "success"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  }`}
                >
                  {selectedTrace.status}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-blue-500 border border-border">
                  {selectedTrace.model}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedTrace, null, 2), selectedTrace.id)}
                  title="Copy JSON representation"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {copiedId === selectedTrace.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedTrace(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-border bg-muted/30 p-3 text-center text-xs">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Latency</div>
                <div className="font-mono font-bold text-foreground mt-0.5">
                  {formatLatency(selectedTrace.latency_ms)}
                </div>
              </div>
              <div className="border-x border-border">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Total Tokens</div>
                <div className="font-mono font-bold text-blue-500 mt-0.5">
                  {(selectedTrace.total_tokens || 0).toLocaleString()}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {selectedTrace.prompt_tokens || 0} in / {selectedTrace.completion_tokens || 0} out
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Cost</div>
                <div className="font-mono font-bold text-emerald-500 mt-0.5">
                  ${(selectedTrace.cost_usd || 0).toFixed(6)}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-blue-500" />
                    <span>Prompt / Input</span>
                  </span>
                  <button
                    onClick={() => handleCopy(selectedTrace.input || "", "in")}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Copy
                  </button>
                </div>
                <div className="rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedTrace.input || "(No input recorded)"}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Completion / Output</span>
                  </span>
                  {selectedTrace.output && (
                    <button
                      onClick={() => handleCopy(selectedTrace.output || "", "out")}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Copy
                    </button>
                  )}
                </div>
                {selectedTrace.output ? (
                  <div className="rounded-md border border-border bg-background p-3 font-sans text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {selectedTrace.output}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    No output generated
                  </div>
                )}
              </div>

              {selectedTrace.error && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Execution Error</span>
                  </div>
                  <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 font-mono text-xs text-rose-500 whitespace-pre-wrap leading-relaxed">
                    {selectedTrace.error}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-muted-foreground">Run Metadata</span>
                <div className="rounded-md border border-border bg-background p-2.5 font-mono text-[11px] text-foreground space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Call Type:</span>
                    {(traceGroups.get(selectedTrace.trace_id || selectedTrace.id) || []).length > 1 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 text-[10px] text-blue-500 font-semibold">
                        <Link2 className="h-2.5 w-2.5 text-blue-500" />
                        <span>Collective Chain ({(traceGroups.get(selectedTrace.trace_id || selectedTrace.id) || []).length} Hops)</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Standalone Call</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trace ID:</span>
                    <span className="text-foreground">{selectedTrace.trace_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Span ID:</span>
                    <span className="text-foreground">{selectedTrace.span_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Run Type:</span>
                    <span className="text-blue-500 font-semibold">{selectedTrace.run_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="text-foreground">{selectedTrace.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span className="text-foreground">{formatTime(selectedTrace.start_time)}</span>
                  </div>

                  {/* Connected Hops in this Collective Call */}
                  {(traceGroups.get(selectedTrace.trace_id || selectedTrace.id) || []).length > 1 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-muted-foreground block mb-1 text-[10px] uppercase font-semibold">
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
                                  ? "bg-blue-600 text-white font-semibold"
                                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={isCurrent ? "text-white font-mono" : "text-blue-500 font-mono"}>Hop {hIdx + 1}:</span>
                                <span className="truncate">{hop.name}</span>
                              </div>
                              <span className="font-mono opacity-80">{formatLatency(hop.latency_ms)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedTrace.metadata && Object.keys(selectedTrace.metadata).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-muted-foreground block mb-1">Custom Attributes:</span>
                      <pre className="text-[10px] text-foreground overflow-x-auto">
                        {typeof selectedTrace.metadata === "string"
                          ? selectedTrace.metadata
                          : JSON.stringify(selectedTrace.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-card p-3 flex items-center justify-end">
              <button
                onClick={() => handleCopy(JSON.stringify(selectedTrace, null, 2), selectedTrace.id)}
                className="flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted"
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

"use client";

import * as React from "react";
import { LLMTraceRecord, LLMMetricsSummary } from "../types";

export function useLLMMetrics() {
  const [traces, setTraces] = React.useState<LLMTraceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedModel, setSelectedModel] = React.useState("All Models");

  // Fetch real traces directly from the database API endpoint
  const fetchTraces = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8080/api/llm/traces?limit=500");
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces || []);
      }
    } catch (e) {
      console.error("Failed to fetch LLM traces from database API:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  // Extract distinct models from real database records
  const models = React.useMemo(() => {
    const set = new Set<string>(["All Models"]);
    traces.forEach((t) => {
      if (t.model) set.add(t.model);
    });
    return Array.from(set);
  }, [traces]);

  // Filter database records by model
  const filteredTraces = React.useMemo(() => {
    if (selectedModel === "All Models") return traces;
    return traces.filter(
      (t) => (t.model || "").toLowerCase() === selectedModel.toLowerCase()
    );
  }, [traces, selectedModel]);

  // Summary KPIs calculated strictly from database records
  const summary: LLMMetricsSummary = React.useMemo(() => {
    const totalCount = filteredTraces.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        errorCount: 0,
        successCount: 0,
        successRate: 100,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalCost: 0,
        avgLatencyMs: 0,
        p99LatencyMs: 0,
      };
    }

    const errorCount = filteredTraces.filter((t) => t.status === "error").length;
    const successCount = totalCount - errorCount;
    const successRate = Math.round((successCount / totalCount) * 100);
    const totalTokens = filteredTraces.reduce((sum, t) => sum + (t.total_tokens || 0), 0);
    const promptTokens = filteredTraces.reduce((sum, t) => sum + (t.prompt_tokens || 0), 0);
    const completionTokens = filteredTraces.reduce((sum, t) => sum + (t.completion_tokens || 0), 0);
    const totalCost = Number(
      filteredTraces.reduce((sum, t) => sum + (t.cost_usd || 0), 0).toFixed(6)
    );
    const avgLatencyMs = Math.round(
      filteredTraces.reduce((sum, t) => sum + (t.latency_ms || 0), 0) / totalCount
    );

    // Sorted latencies for P99 calculation
    const sortedLats = [...filteredTraces.map((t) => t.latency_ms || 0)].sort((a, b) => a - b);
    const p99Index = Math.min(
      Math.floor(sortedLats.length * 0.99),
      sortedLats.length - 1
    );
    const p99LatencyMs = Math.round(sortedLats[p99Index] || avgLatencyMs);

    return {
      totalCount,
      errorCount,
      successCount,
      successRate,
      totalTokens,
      promptTokens,
      completionTokens,
      totalCost,
      avgLatencyMs,
      p99LatencyMs,
    };
  }, [filteredTraces]);

  // Helper to format ISO timestamp into readable chart bucket key
  const formatTimeBucket = (isoString?: string) => {
    if (!isoString) return "Unknown";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Unknown";
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
    } catch {
      return "Unknown";
    }
  };

  // Group traces into chronological time buckets
  const timeBuckets = React.useMemo(() => {
    const buckets: Record<string, LLMTraceRecord[]> = {};
    // Sort chronological first
    const sorted = [...filteredTraces].sort((a, b) => {
      const ta = new Date(a.start_time || 0).getTime();
      const tb = new Date(b.start_time || 0).getTime();
      return ta - tb;
    });

    sorted.forEach((t) => {
      const bucket = formatTimeBucket(t.start_time);
      if (!buckets[bucket]) buckets[bucket] = [];
      buckets[bucket].push(t);
    });
    return buckets;
  }, [filteredTraces]);

  const bucketKeys = Object.keys(timeBuckets);

  // 1. Trace Count Data
  const traceCountData = React.useMemo(() => {
    return bucketKeys.map((time) => {
      const group = timeBuckets[time] || [];
      const error = group.filter((t) => t.status === "error").length;
      const success = group.length - error;
      return { time, success, error, total: group.length };
    });
  }, [timeBuckets, bucketKeys]);

  // 2. Trace Latency Data (P50 & P99 in seconds)
  const traceLatencyData = React.useMemo(() => {
    return bucketKeys.map((time) => {
      const group = timeBuckets[time] || [];
      const lats = group.map((t) => t.latency_ms || 0).sort((a, b) => a - b);
      const p50 = lats.length > 0 ? Number(((lats[Math.floor(lats.length * 0.5)] || 0) / 1000).toFixed(2)) : 0;
      const p99 = lats.length > 0 ? Number(((lats[Math.floor(lats.length * 0.99)] || 0) / 1000).toFixed(2)) : 0;
      return { time, p50, p99 };
    });
  }, [timeBuckets, bucketKeys]);

  // 3. Trace Error Rate Data (%)
  const traceErrorRateData = React.useMemo(() => {
    return bucketKeys.map((time) => {
      const group = timeBuckets[time] || [];
      const error = group.filter((t) => t.status === "error").length;
      const rate = group.length > 0 ? Number(((error / group.length) * 100).toFixed(1)) : 0;
      return { time, errorRate: rate };
    });
  }, [timeBuckets, bucketKeys]);

  // 4. LLM Invocations (Calls & Latency)
  const llmTraces = React.useMemo(() => {
    return filteredTraces.filter((t) => !t.run_type || t.run_type === "llm" || t.model);
  }, [filteredTraces]);

  const llmCountData = React.useMemo(() => {
    return bucketKeys.map((time) => {
      const group = (timeBuckets[time] || []).filter((t) => !t.run_type || t.run_type === "llm" || t.model);
      const error = group.filter((t) => t.status === "error").length;
      const success = group.length - error;
      return { time, success, error, total: group.length };
    });
  }, [timeBuckets, bucketKeys]);

  const llmLatencyData = React.useMemo(() => {
    return bucketKeys.map((time) => {
      const group = (timeBuckets[time] || []).filter((t) => !t.run_type || t.run_type === "llm" || t.model);
      const lats = group.map((t) => t.latency_ms || 0).sort((a, b) => a - b);
      const p50 = lats.length > 0 ? Number(((lats[Math.floor(lats.length * 0.5)] || 0) / 1000).toFixed(2)) : 0;
      const p99 = lats.length > 0 ? Number(((lats[Math.floor(lats.length * 0.99)] || 0) / 1000).toFixed(2)) : 0;
      return { time, p50, p99 };
    });
  }, [timeBuckets, bucketKeys]);

  // 5. Total Cost Data ($)
  const totalCostData = React.useMemo(() => {
    let running = 0;
    return bucketKeys.map((time) => {
      const group = timeBuckets[time] || [];
      const bucketCost = group.reduce((sum, t) => sum + (t.cost_usd || 0), 0);
      running += bucketCost;
      return { time, total: Number(running.toFixed(5)) };
    });
  }, [timeBuckets, bucketKeys]);

  // 6. Tokens Data (Input & Output)
  const tokensData = React.useMemo(() => {
    return bucketKeys.map((time) => {
      const group = timeBuckets[time] || [];
      const input = group.reduce((sum, t) => sum + (t.prompt_tokens || 0), 0);
      const output = group.reduce((sum, t) => sum + (t.completion_tokens || 0), 0);
      return { time, input, output };
    });
  }, [timeBuckets, bucketKeys]);

  // 7. Tools Data (Tool invocations from DB records)
  const toolNames = React.useMemo(() => {
    const set = new Set<string>();
    filteredTraces.forEach((t) => {
      if (t.run_type === "tool" || t.name?.includes("tool") || t.metadata?.tool_name) {
        set.add(t.metadata?.tool_name || t.name);
      }
    });
    return Array.from(set);
  }, [filteredTraces]);

  const toolsCountData = React.useMemo(() => {
    if (toolNames.length === 0) return [];
    return bucketKeys.map((time) => {
      const group = timeBuckets[time] || [];
      const entry: Record<string, any> = { time };
      toolNames.forEach((tool) => {
        entry[tool] = group.filter(
          (t) => (t.metadata?.tool_name || t.name) === tool
        ).length;
      });
      return entry;
    });
  }, [timeBuckets, bucketKeys, toolNames]);

  const toolsLatencyData = React.useMemo(() => {
    if (toolNames.length === 0) return [];
    return bucketKeys.map((time) => {
      const group = timeBuckets[time] || [];
      const entry: Record<string, any> = { time };
      toolNames.forEach((tool) => {
        const matches = group.filter((t) => (t.metadata?.tool_name || t.name) === tool);
        const avg = matches.length > 0
          ? Number((matches.reduce((s, t) => s + (t.latency_ms || 0), 0) / matches.length / 1000).toFixed(2))
          : 0;
        entry[tool] = avg;
      });
      return entry;
    });
  }, [timeBuckets, bucketKeys, toolNames]);

  return {
    traces: filteredTraces,
    rawTraces: traces,
    loading,
    refresh: fetchTraces,
    models,
    selectedModel,
    setSelectedModel,
    summary,
    toolNames,
    // Chart datasets (all purely from DB)
    traceCountData,
    traceLatencyData,
    traceErrorRateData,
    llmCountData,
    llmLatencyData,
    totalCostData,
    tokensData,
    toolsCountData,
    toolsLatencyData,
  };
}

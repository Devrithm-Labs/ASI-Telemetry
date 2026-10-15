"use client";

import * as React from "react";
import { LLMMetricsSummary } from "../types";

const INITIAL_SUMMARY: LLMMetricsSummary = {
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

export function useLLMMetrics() {
  const [loading, setLoading] = React.useState(true);
  const [selectedModel, setSelectedModel] = React.useState("All Models");
  const [models, setModels] = React.useState<string[]>(["All Models"]);
  const [summary, setSummary] = React.useState<LLMMetricsSummary>(INITIAL_SUMMARY);
  const [toolNames, setToolNames] = React.useState<string[]>([]);

  // Chart datasets (all pre-calculated and aggregated in the backend)
  const [traceCountData, setTraceCountData] = React.useState<any[]>([]);
  const [traceLatencyData, setTraceLatencyData] = React.useState<any[]>([]);
  const [traceErrorRateData, setTraceErrorRateData] = React.useState<any[]>([]);
  const [llmCountData, setLlmCountData] = React.useState<any[]>([]);
  const [llmLatencyData, setLlmLatencyData] = React.useState<any[]>([]);
  const [totalCostData, setTotalCostData] = React.useState<any[]>([]);
  const [costPerTraceData, setCostPerTraceData] = React.useState<any[]>([]);
  const [tokensData, setTokensData] = React.useState<any[]>([]);
  const [outputTokensPerTraceData, setOutputTokensPerTraceData] = React.useState<any[]>([]);
  const [inputTokensPerTraceData, setInputTokensPerTraceData] = React.useState<any[]>([]);
  const [toolsCountData, setToolsCountData] = React.useState<any[]>([]);
  const [toolsLatencyData, setToolsLatencyData] = React.useState<any[]>([]);

  const fetchMetrics = React.useCallback(async (modelToFetch = selectedModel) => {
    setLoading(true);
    try {
      const url =
        modelToFetch && modelToFetch !== "All Models"
          ? `http://127.0.0.1:8080/api/llm/monitoring?model=${encodeURIComponent(modelToFetch)}`
          : "http://127.0.0.1:8080/api/llm/monitoring";

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setSummary(data.summary);
        if (Array.isArray(data.models)) setModels(data.models);
        if (Array.isArray(data.toolNames)) setToolNames(data.toolNames);
        setTraceCountData(data.traceCountData || []);
        setTraceLatencyData(data.traceLatencyData || []);
        setTraceErrorRateData(data.traceErrorRateData || []);
        setLlmCountData(data.llmCountData || []);
        setLlmLatencyData(data.llmLatencyData || []);
        setTotalCostData(data.totalCostData || []);
        setCostPerTraceData(data.costPerTraceData || []);
        setTokensData(data.tokensData || []);
        setOutputTokensPerTraceData(data.outputTokensPerTraceData || []);
        setInputTokensPerTraceData(data.inputTokensPerTraceData || []);
        setToolsCountData(data.toolsCountData || []);
        setToolsLatencyData(data.toolsLatencyData || []);
      }
    } catch (e) {
      console.error("Failed to fetch LLM monitoring data from backend:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  React.useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  return {
    loading,
    refresh: () => fetchMetrics(selectedModel),
    models,
    selectedModel,
    setSelectedModel: handleModelChange,
    summary,
    toolNames,
    traceCountData,
    traceLatencyData,
    traceErrorRateData,
    llmCountData,
    llmLatencyData,
    totalCostData,
    costPerTraceData,
    tokensData,
    outputTokensPerTraceData,
    inputTokensPerTraceData,
    toolsCountData,
    toolsLatencyData,
  };
}

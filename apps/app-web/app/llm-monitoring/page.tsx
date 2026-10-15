"use client";

import * as React from "react";
import { MonitoringTab } from "./types";
import { useLLMMetrics } from "./hooks/use-llm-metrics";
import { TopControls } from "./components/top-controls";
import { KPISummaryStrip } from "./components/kpi-strip";
import { TracesSection } from "./sections/traces-section";
import { LLMCallsSection } from "./sections/llm-calls-section";
import { CostTokensSection } from "./sections/cost-tokens-section";
import { ToolsSection } from "./sections/tools-section";

export default function LLMMonitoringPage() {
  const {
    loading,
    refresh,
    models,
    selectedModel,
    setSelectedModel,
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
  } = useLLMMetrics();

  const [activeTab, setActiveTab] = React.useState<MonitoringTab>("traces");

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({
    traces: false,
    "llm-calls": false,
    "cost-tokens": false,
    tools: false,
  });

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTabChange = (tabId: MonitoringTab) => {
    setActiveTab(tabId);
    const el = document.getElementById(`section-${tabId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Top Navigation and Controls */}
      <TopControls
        activeTab={activeTab}
        onTabChange={handleTabChange}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        models={models}
        totalTracesCount={summary.totalCount}
        onRefresh={refresh}
        loading={loading}
      />

      {/* Main Dashboard Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10 scroll-smooth">
        {/* Top 4 KPI Metrics Strip */}
        <KPISummaryStrip summary={summary} />

        {/* 1. Traces Section */}
        <TracesSection
          collapsed={!!collapsed["traces"]}
          onToggle={() => toggleSection("traces")}
          countData={traceCountData}
          latencyData={traceLatencyData}
          errorRateData={traceErrorRateData}
          totalRuns={summary.totalCount}
        />

        {/* 2. LLM Calls Section */}
        <LLMCallsSection
          collapsed={!!collapsed["llm-calls"]}
          onToggle={() => toggleSection("llm-calls")}
          countData={llmCountData}
          latencyData={llmLatencyData}
          activeModelsCount={models.length > 1 ? models.length - 1 : models.length}
        />

        {/* 3. Cost & Tokens Section */}
        <CostTokensSection
          collapsed={!!collapsed["cost-tokens"]}
          onToggle={() => toggleSection("cost-tokens")}
          costData={totalCostData}
          costPerTraceData={costPerTraceData}
          tokensData={tokensData}
          outputTokensPerTraceData={outputTokensPerTraceData}
          inputTokensPerTraceData={inputTokensPerTraceData}
          totalCostUSD={summary.totalCost}
        />

        {/* 4. Tools Section */}
        <ToolsSection
          collapsed={!!collapsed["tools"]}
          onToggle={() => toggleSection("tools")}
          toolNames={toolNames}
          toolsCountData={toolsCountData}
          toolsLatencyData={toolsLatencyData}
        />
      </div>
    </div>
  );
}

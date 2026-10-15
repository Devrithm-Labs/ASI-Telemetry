"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonitoringChartCard } from "../components/chart-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const llmCountConfig: ChartConfig = {
  success: { label: "Success", color: "#10b981" },
  error: { label: "Error", color: "#f87171" },
};

const llmLatencyConfig: ChartConfig = {
  p50: { label: "P50", color: "#3b82f6" },
  p99: { label: "P99", color: "#f59e0b" },
};

interface LLMCallsSectionProps {
  collapsed: boolean;
  onToggle: () => void;
  countData: Array<{ time: string; success: number; error: number; total: number }>;
  latencyData: Array<{ time: string; p50: number; p99: number }>;
  activeModelsCount: number;
}

export function LLMCallsSection({
  collapsed,
  onToggle,
  countData,
  latencyData,
  activeModelsCount,
}: LLMCallsSectionProps) {
  const hasData = countData.length > 0;

  return (
    <section id="section-llm-calls" className="space-y-4">
      <div
        onClick={onToggle}
        className="group flex cursor-pointer items-center justify-between border-b border-border/80 pb-2.5 select-none"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground group-hover:text-blue-500 transition-colors flex items-center gap-1.5">
            <span>LLM Calls</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                collapsed ? "-rotate-90" : "rotate-0"
              )}
            />
          </h2>
          <span className="text-xs text-muted-foreground font-normal">
            — Foundation model invocations & latency
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          {activeModelsCount} {activeModelsCount === 1 ? "model" : "models"} tracked
        </span>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. LLM Count */}
          <MonitoringChartCard
            title="LLM Count"
            subtitle="Number of LLM calls over time"
            legend={[
              { label: "Success", color: "#10b981" },
              { label: "Error", color: "#f87171" },
            ]}
            empty={!hasData}
          >
            <ChartContainer config={llmCountConfig} className="h-56 w-full">
              <LineChart data={countData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="error" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>

          {/* 2. LLM Latency */}
          <MonitoringChartCard
            title="LLM Latency"
            subtitle="LLM call latency percentiles over time"
            legend={[
              { label: "P50", color: "#3b82f6" },
              { label: "P99", color: "#f59e0b" },
            ]}
            empty={!hasData}
          >
            <ChartContainer config={llmLatencyConfig} className="h-56 w-full">
              <LineChart data={latencyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} unit="s" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} />
                <Line type="monotone" dataKey="p99" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3.5 }} />
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>
        </div>
      )}
    </section>
  );
}

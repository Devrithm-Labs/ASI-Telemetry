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
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const totalCostConfig: ChartConfig = {
  total: { label: "Total Cost", color: "#3b82f6" },
};

const costPerTraceConfig: ChartConfig = {
  cost: { label: "Cost / Trace", color: "#38bdf8" },
};

const tokensConfig: ChartConfig = {
  output: { label: "Output Tokens", color: "#818cf8" },
  input: { label: "Input Tokens", color: "#38bdf8" },
};

const outputPerTraceConfig: ChartConfig = {
  output: { label: "Output / Trace", color: "#818cf8" },
};

const inputPerTraceConfig: ChartConfig = {
  input: { label: "Input / Trace", color: "#38bdf8" },
};

interface CostTokensSectionProps {
  collapsed?: boolean;
  onToggle?: () => void;
  costData: Array<{ time: string; total: number }>;
  costPerTraceData?: Array<{ time: string; cost: number }>;
  tokensData: Array<{ time: string; input: number; output: number }>;
  outputTokensPerTraceData?: Array<{ time: string; output: number }>;
  inputTokensPerTraceData?: Array<{ time: string; input: number }>;
  totalCostUSD: number;
}

export function CostTokensSection({
  collapsed = false,
  onToggle,
  costData,
  costPerTraceData = [],
  tokensData,
  outputTokensPerTraceData = [],
  inputTokensPerTraceData = [],
  totalCostUSD,
}: CostTokensSectionProps) {
  const hasCost = costData.length > 0 && costData.some((d) => d.total > 0);
  const hasCostPerTrace = costPerTraceData.length > 0 && costPerTraceData.some((d) => d.cost > 0);
  const hasTokens = tokensData.length > 0 && tokensData.some((d) => d.input > 0 || d.output > 0);
  const hasOutputPerTrace = outputTokensPerTraceData.length > 0 && outputTokensPerTraceData.some((d) => d.output > 0);
  const hasInputPerTrace = inputTokensPerTraceData.length > 0 && inputTokensPerTraceData.some((d) => d.input > 0);

  return (
    <section id="section-cost-tokens" className="space-y-4">
      <div
        onClick={onToggle}
        className="group flex cursor-pointer items-center justify-between border-b border-border/80 pb-2.5 select-none"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground group-hover:text-foreground/80 transition-colors flex items-center gap-1.5">
            <span>Cost & Tokens</span>
          </h2>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          ${totalCostUSD.toFixed(4)} total
        </span>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Total Cost */}
          <MonitoringChartCard
            title="Total Cost"
            subtitle="Cumulative inference cost over time"
            legend={[{ label: "Total Cost", color: "#3b82f6" }]}
            empty={!hasCost}
          >
            <ChartContainer config={totalCostConfig} className="h-56 w-full">
              <AreaChart data={costData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="#3b82f6"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ChartContainer>
          </MonitoringChartCard>

          {/* 2. Cost per Trace */}
          <MonitoringChartCard
            title="Cost per Trace"
            subtitle="Average cost per trace over time"
            legend={[{ label: "Cost / Trace", color: "#38bdf8" }]}
            empty={!hasCostPerTrace}
          >
            <ChartContainer config={costPerTraceConfig} className="h-56 w-full">
              <LineChart data={costPerTraceData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="cost" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>

          {/* 3. Output Tokens */}
          <MonitoringChartCard
            title="Output Tokens"
            subtitle="Total output tokens over time"
            legend={[{ label: "Output Tokens", color: "#818cf8" }]}
            empty={!hasTokens}
          >
            <ChartContainer config={tokensConfig} className="h-56 w-full">
              <LineChart data={tokensData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="output" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>

          {/* 4. Output Tokens per Trace */}
          <MonitoringChartCard
            title="Output Tokens per Trace"
            subtitle="Median output tokens used per trace over time"
            legend={[{ label: "Output / Trace", color: "#818cf8" }]}
            empty={!hasOutputPerTrace}
          >
            <ChartContainer config={outputPerTraceConfig} className="h-56 w-full">
              <LineChart data={outputTokensPerTraceData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="output" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>

          {/* 5. Input Tokens */}
          <MonitoringChartCard
            title="Input Tokens"
            subtitle="Total input tokens over time"
            legend={[{ label: "Input Tokens", color: "#38bdf8" }]}
            empty={!hasTokens}
          >
            <ChartContainer config={tokensConfig} className="h-56 w-full">
              <LineChart data={tokensData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="input" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>

          {/* 6. Input Tokens per Trace */}
          <MonitoringChartCard
            title="Input Tokens per Trace"
            subtitle="Median input tokens used per trace over time"
            legend={[{ label: "Input / Trace", color: "#38bdf8" }]}
            empty={!hasInputPerTrace}
          >
            <ChartContainer config={inputPerTraceConfig} className="h-56 w-full">
              <LineChart data={inputTokensPerTraceData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="input" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>
        </div>
      )}
    </section>
  );
}

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
  total: { label: "Total", color: "#3b82f6" },
};

const tokensConfig: ChartConfig = {
  output: { label: "Output", color: "#818cf8" },
  input: { label: "Input", color: "#38bdf8" },
};

interface CostTokensSectionProps {
  collapsed: boolean;
  onToggle: () => void;
  costData: Array<{ time: string; total: number }>;
  tokensData: Array<{ time: string; input: number; output: number }>;
  totalCostUSD: number;
}

export function CostTokensSection({
  collapsed,
  onToggle,
  costData,
  tokensData,
  totalCostUSD,
}: CostTokensSectionProps) {
  const hasCost = costData.length > 0 && costData.some((d) => d.total > 0);
  const hasTokens = tokensData.length > 0 && tokensData.some((d) => d.input > 0 || d.output > 0);

  return (
    <section id="section-cost-tokens" className="space-y-4">
      <div
        onClick={onToggle}
        className="group flex cursor-pointer items-center justify-between border-b border-border/80 pb-2.5 select-none"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground group-hover:text-blue-500 transition-colors flex items-center gap-1.5">
            <span>Cost & Tokens</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                collapsed ? "-rotate-90" : "rotate-0"
              )}
            />
          </h2>
          <span className="text-xs text-muted-foreground font-normal">
            — Token usage and expenditure per trace
          </span>
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
            subtitle="Total cost over time"
            legend={[{ label: "Total", color: "#3b82f6" }]}
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
            subtitle="Median cost per trace"
            empty={true}
            emptyTitle="No charting data found"
          />

          {/* 3. Output Tokens */}
          <MonitoringChartCard
            title="Output Tokens"
            subtitle="Total output tokens over time"
            legend={[{ label: "Output", color: "#818cf8" }]}
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
            subtitle="Output tokens used per trace over time"
            empty={true}
            emptyTitle="No charting data found"
          />

          {/* 5. Input Tokens */}
          <MonitoringChartCard
            title="Input Tokens"
            subtitle="Total input tokens over time"
            legend={[{ label: "Input", color: "#38bdf8" }]}
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
            subtitle="Input tokens used per trace over time"
            empty={true}
            emptyTitle="No charting data found"
          />
        </div>
      )}
    </section>
  );
}

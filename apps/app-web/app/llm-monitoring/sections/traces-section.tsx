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
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const traceCountConfig: ChartConfig = {
  success: { label: "Success", color: "#10b981" },
  error: { label: "Error", color: "#f87171" },
};

const traceLatencyConfig: ChartConfig = {
  p50: { label: "P50", color: "#3b82f6" },
  p99: { label: "P99", color: "#f59e0b" },
};

const traceErrorRateConfig: ChartConfig = {
  errorRate: { label: "Traces", color: "#3b82f6" },
};

interface TracesSectionProps {
  collapsed?: boolean;
  onToggle?: () => void;
  countData: Array<{ time: string; success: number; error: number; total: number }>;
  latencyData: Array<{ time: string; p50: number; p99: number }>;
  errorRateData: Array<{ time: string; errorRate: number }>;
  totalRuns: number;
}

export function TracesSection({
  collapsed = false,
  onToggle,
  countData,
  latencyData,
  errorRateData,
  totalRuns,
}: TracesSectionProps) {
  const hasData = countData.length > 0;
  const hasLatencyData = latencyData.some((d) => (d.p50 != null && d.p50 > 0) || (d.p99 != null && d.p99 > 0));

  return (
    <section id="section-traces" className="space-y-4">
      {/* Section Header */}
      <div
        onClick={onToggle}
        className="group flex cursor-pointer items-center justify-between border-b border-border/80 pb-2.5 select-none"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground group-hover:text-foreground/80 transition-colors flex items-center gap-1.5">
            <span>Traces</span>
          </h2>

        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          {totalRuns} {totalRuns === 1 ? "run" : "runs"} recorded
        </span>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Trace Count */}
          <MonitoringChartCard
            title="Trace Count"
            subtitle="Total number of traces over time"
            legend={[
              { label: "Success", color: "#10b981" },
              { label: "Error", color: "#f87171" },
            ]}
            empty={!hasData}
          >
            <ChartContainer config={traceCountConfig} className="h-56 w-full">
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

          {/* 2. Trace Latency */}
          <MonitoringChartCard
            title="Trace Latency"
            subtitle="Trace latency percentiles over time"
            legend={[
              { label: "P50", color: "#3b82f6" },
              { label: "P99", color: "#f59e0b" },
            ]}
            empty={!hasLatencyData}
            emptyTitle="No latency data recorded in this time range"
          >
            <ChartContainer config={traceLatencyConfig} className="h-56 w-full">
              <LineChart data={latencyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} unit="s" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} connectNulls={false} />
                <Line type="monotone" dataKey="p99" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3.5 }} connectNulls={false} />
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>

          {/* 3. Trace Error Rate */}
          <div className="md:col-span-2">
            <MonitoringChartCard
              title="Trace Error Rate"
              subtitle="Percent of traces that errored over time"
              legend={[{ label: "Traces", color: "#3b82f6" }]}
              empty={!hasData}
            >
              <ChartContainer config={traceErrorRateConfig} className="h-52 w-full">
                <AreaChart data={errorRateData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                  <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} unit="%" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="errorRate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="#3b82f6"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ChartContainer>
            </MonitoringChartCard>
          </div>
        </div>
      )}
    </section>
  );
}

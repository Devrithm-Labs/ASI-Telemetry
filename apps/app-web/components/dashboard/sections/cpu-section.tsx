"use client";

import * as React from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CpuMetricPoint, MetricSummary } from "../context/dashboard-types";
import { Cpu, Layers, Search } from "lucide-react";

interface CpuSectionProps {
  data: CpuMetricPoint[];
  summary?: MetricSummary | null;
}

const cpuChartConfig = {
  cpuPercent: {
    label: "CPU Usage %",
    color: "var(--foreground)",
  },
  coreLoad: {
    label: "Load Avg",
    color: "#a1a1aa",
  },
} satisfies ChartConfig;

const memoryChartConfig = {
  memoryPercent: {
    label: "Memory (MB)",
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

export function CpuSection({ data, summary }: CpuSectionProps) {
  const latestCpu = summary?.current_cpu != null
    ? Math.round(summary.current_cpu)
    : (data.length > 0 ? (data[data.length - 1]?.cpuPercent ?? 0) : 0);
  const latestMem = summary?.current_memory != null
    ? Math.round(summary.current_memory)
    : (data.length > 0 ? (data[data.length - 1]?.memoryPercent ?? 0) : 0);
  const latestLoad = data.length > 0 ? (data[data.length - 1]?.coreLoad ?? 0) : 0;

  const hasData = data && data.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Component 1: CPU Core Utilization */}
      <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all duration-200 hover:border-foreground/30">
        {/* Simplified Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-foreground shadow-xs">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CPU Core Utilization
              </h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">{latestCpu}%</span>
                <span className="text-xs text-muted-foreground font-mono ml-1">
                  (load: {latestLoad})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">CPU %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#a1a1aa]" />
              <span className="text-[11px] text-muted-foreground font-medium">Core Load</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="p-5 flex-1 flex flex-col justify-end">
          {!hasData ? (
            <div className="flex h-52 flex-col items-center justify-center text-center p-4 select-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground mb-2">
                <Search className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">No host metrics</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Host resource telemetry not yet received.</p>
            </div>
          ) : (
            <ChartContainer config={cpuChartConfig} className="h-56 w-full">
              <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={true} />
                <XAxis
                  dataKey="time"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="cpuPercent"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="coreLoad"
                  stroke="#a1a1aa"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </Card>

      {/* Component 2: Memory Footprint */}
      <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all duration-200 hover:border-foreground/30">
        {/* Simplified Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-foreground shadow-xs">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Memory Consumption
              </h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">{latestMem}</span>
                <span className="text-xs font-semibold text-muted-foreground font-mono ml-1">MB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">Memory (MB)</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              <span>Live Sync</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="p-5 flex-1 flex flex-col justify-end">
          {!hasData ? (
            <div className="flex h-52 flex-col items-center justify-center text-center p-4 select-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground mb-2">
                <Search className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">No memory records</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Memory telemetry probe awaiting buffer data.</p>
            </div>
          ) : (
            <ChartContainer config={memoryChartConfig} className="h-56 w-full">
              <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={true} />
                <XAxis
                  dataKey="time"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  unit="MB"
                  domain={[0, (dataMax: number) => Math.max(dataMax ? Math.ceil(dataMax * 1.25) : 200, 100)]}
                  tickCount={5}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="memoryPercent"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

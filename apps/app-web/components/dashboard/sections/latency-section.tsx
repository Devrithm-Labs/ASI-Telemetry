"use client";

import * as React from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ReferenceLine,
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
import { LatencyMetricPoint, MetricSummary } from "../context/dashboard-types";
import { Clock, Search, TrendingUp } from "lucide-react";

interface LatencySectionProps {
  data: LatencyMetricPoint[];
  summary?: MetricSummary | null;
}

const p50ChartConfig = {
  p50: {
    label: "P50 Median",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

const tailChartConfig = {
  p90: {
    label: "P90 Percentile",
    color: "#60a5fa",
  },
  p99: {
    label: "P99 Tail",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export function LatencySection({ data, summary }: LatencySectionProps) {
  const avgP50 = React.useMemo(
    () => Math.round(data.reduce((acc, curr) => acc + curr.p50, 0) / (data.length || 1)),
    [data]
  );
  const avgP90 = React.useMemo(
    () => Math.round(data.reduce((acc, curr) => acc + curr.p90, 0) / (data.length || 1)),
    [data]
  );
  const maxP99 = React.useMemo(
    () => (data.length > 0 ? Math.max(...data.map((d) => d.p99)) : 0),
    [data]
  );

  const hasData = data && data.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Component 1: Median Response Time (P50) */}
      <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-blue-500/30 hover:shadow-md">
        {/* Simplified Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-card/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-background text-blue-500 shadow-xs">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Median Latency (P50)
              </h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">{avgP50}</span>
                <span className="text-xs font-semibold text-blue-500 font-mono">ms</span>
                {summary?.avg_response_time_ms != null && (
                  <span className="text-xs text-muted-foreground font-mono ml-1">
                    (mean: {Math.round(summary.avg_response_time_ms)}ms)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[11px] text-muted-foreground font-medium">P50</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-xs bg-[#3b82f6]" />
              <span className="text-[11px] text-muted-foreground font-medium">SLA 300ms</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="p-5 flex-1 flex flex-col justify-end">
          {!hasData ? (
            <div className="flex h-52 flex-col items-center justify-center text-center p-4 select-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground mb-2">
                <Search className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">No latency metrics</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No response times recorded in this window.</p>
            </div>
          ) : (
            <ChartContainer config={p50ChartConfig} className="h-56 w-full">
              <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  unit="ms"
                  domain={[0, (dataMax: number) => Math.max(dataMax ? Math.ceil(dataMax * 1.25) : 350, 350)]}
                  tickCount={5}
                />
                <ReferenceLine
                  y={300}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "SLA (300ms)",
                    fill: "#3b82f6",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="p50"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </Card>

      {/* Component 2: Tail Latency (P90 & P99) */}
      <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-amber-500/30 hover:shadow-md">
        {/* Simplified Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-card/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-background text-amber-500 shadow-xs">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tail Latency (P90 &amp; P99)
              </h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">{maxP99}</span>
                <span className="text-xs font-semibold text-amber-500 font-mono">ms max</span>
                <span className="text-xs text-muted-foreground font-mono ml-1">
                  (P90: {avgP90}ms)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#60a5fa]" />
              <span className="text-[11px] text-muted-foreground font-medium">P90</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span className="text-[11px] text-muted-foreground font-medium">P99</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="p-5 flex-1 flex flex-col justify-end">
          {!hasData ? (
            <div className="flex h-52 flex-col items-center justify-center text-center p-4 select-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground mb-2">
                <Search className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">No tail latency records</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No outlier metrics found in this window.</p>
            </div>
          ) : (
            <ChartContainer config={tailChartConfig} className="h-56 w-full">
              <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  unit="ms"
                  domain={[0, (dataMax: number) => Math.max(dataMax ? Math.ceil(dataMax * 1.25) : 400, 400)]}
                  tickCount={5}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="p90"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="p99"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3.5 }}
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

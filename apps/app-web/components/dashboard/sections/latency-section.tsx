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
import { Clock, Search } from "lucide-react";

interface LatencySectionProps {
  data: LatencyMetricPoint[];
  summary?: MetricSummary | null;
}

const latencyChartConfig = {
  avg: {
    label: "Average Latency",
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

export function LatencySection({ data, summary }: LatencySectionProps) {
  // Extract average points safely from data (supporting .avg, .latency, or .p50)
  const chartData = React.useMemo(() => {
    return (data || []).map((d) => ({
      ...d,
      avg: d.avg ?? d.latency ?? d.p50 ?? 0,
    }));
  }, [data]);

  // Overall average latency
  const overallAvg = React.useMemo(() => {
    if (summary?.avg_response_time_ms != null && summary.avg_response_time_ms > 0) {
      return Math.round(summary.avg_response_time_ms);
    }
    const nonZero = chartData.filter((d) => d.avg > 0);
    if (nonZero.length === 0) return 0;
    return Math.round(nonZero.reduce((acc, curr) => acc + curr.avg, 0) / nonZero.length);
  }, [chartData, summary]);

  // Peak latency
  const peakLatency = React.useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(Math.max(...chartData.map((d) => d.avg)));
  }, [chartData]);

  // Min latency (among non-zero)
  const minLatency = React.useMemo(() => {
    const nonZero = chartData.filter((d) => d.avg > 0);
    if (nonZero.length === 0) return 0;
    return Math.round(Math.min(...nonZero.map((d) => d.avg)));
  }, [chartData]);

  const hasData = chartData.length > 0 && chartData.some((d) => d.avg > 0);

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all duration-200 hover:border-foreground/30">
      {/* Simplified Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-3.5 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-foreground shadow-xs">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average Latency Over Time
            </h3>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-foreground">{overallAvg}</span>
              <span className="text-xs font-semibold text-muted-foreground font-mono">ms avg</span>
              {peakLatency > 0 && (
                <span className="text-xs text-muted-foreground font-mono ml-1">
                  (Peak: {peakLatency}ms{minLatency > 0 && minLatency !== peakLatency ? ` • Min: ${minLatency}ms` : ""})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">Average Latency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-xs bg-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">SLA 300ms</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-5 flex-1 flex flex-col justify-end">
        {!hasData ? (
          <div className="flex h-56 flex-col items-center justify-center text-center p-4 select-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground mb-2">
              <Search className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-foreground">No latency metrics</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              No response times recorded in this window.
            </p>
          </div>
        ) : (
          <ChartContainer config={latencyChartConfig} className="h-60 w-full">
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
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
                unit="ms"
                domain={[0, (dataMax: number) => Math.max(dataMax ? Math.ceil(dataMax * 1.25) : 350, 350)]}
                tickCount={5}
              />
              <ReferenceLine
                y={300}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "SLA (300ms)",
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Line
                type="monotone"
                dataKey="avg"
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
  );
}

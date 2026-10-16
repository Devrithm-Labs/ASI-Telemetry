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
import { ErrorMetricPoint, MetricSummary } from "../context/dashboard-types";
import { AlertCircle, AlertTriangle, Search } from "lucide-react";

interface ErrorSectionProps {
  data: ErrorMetricPoint[];
  summary?: MetricSummary | null;
}

const errorRateChartConfig = {
  errorRate: {
    label: "Error Rate %",
    color: "#ef4444",
  },
} satisfies ChartConfig;

const statusBreakdownConfig = {
  serverError: {
    label: "500 Server",
    color: "#ef4444",
  },
  rateLimit: {
    label: "429 Rate Limit",
    color: "#f59e0b",
  },
  timeout: {
    label: "504 Timeout",
    color: "#3b82f6",
  },
  validationError: {
    label: "400 Client",
    color: "#a855f7",
  },
} satisfies ChartConfig;

export function ErrorSection({ data, summary }: ErrorSectionProps) {
  const latestErrorRate = data.length > 0 ? (data[data.length - 1]?.errorRate ?? 0) : 0;
  const totalErrors = React.useMemo(
    () =>
      data.reduce(
        (acc, curr) =>
          acc + curr.timeout + curr.rateLimit + curr.serverError + curr.validationError,
        0
      ),
    [data]
  );

  const errorRateDisplay = summary?.error_rate != null
    ? summary.error_rate.toFixed(1)
    : (data.length > 0 ? latestErrorRate.toFixed(1) : "0.0");

  const faultsCount = summary?.total_errors ?? totalErrors;

  const count500 = React.useMemo(() => data.reduce((a, c) => a + c.serverError, 0), [data]);
  const count429 = React.useMemo(() => data.reduce((a, c) => a + c.rateLimit, 0), [data]);
  const count504 = React.useMemo(() => data.reduce((a, c) => a + c.timeout, 0), [data]);
  const count400 = React.useMemo(() => data.reduce((a, c) => a + c.validationError, 0), [data]);

  const hasData = data && data.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Component 1: Trace Error Rate % */}
      <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-rose-500/30 hover:shadow-md">
        {/* Simplified Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-card/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-background text-rose-500 shadow-xs">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trace Error Rate %
              </h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-rose-500">{errorRateDisplay}%</span>
                <span className="text-xs text-muted-foreground font-mono ml-1">
                  ({faultsCount.toLocaleString()} faults)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
              <span className="text-[11px] text-muted-foreground font-medium">Error Rate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-xs bg-[#3b82f6]" />
              <span className="text-[11px] text-muted-foreground font-medium">SLO &lt;1%</span>
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
              <p className="text-xs font-semibold text-foreground">No error records</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">All invocations completed successfully.</p>
            </div>
          ) : (
            <ChartContainer config={errorRateChartConfig} className="h-56 w-full">
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
                  unit="%"
                  domain={[0, (dataMax: number) => Math.max(dataMax ? Math.ceil(dataMax * 1.25) : 10, 10)]}
                  tickCount={5}
                />
                <ReferenceLine
                  y={1}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "SLO 1%",
                    fill: "#3b82f6",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </Card>

      {/* Component 2: Error Status Breakdown */}
      <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-amber-500/30 hover:shadow-md">
        {/* Simplified Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-card/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-background text-amber-500 shadow-xs">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Error Code Breakdown
              </h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">{faultsCount}</span>
                <span className="text-xs text-muted-foreground font-mono">incidents</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
              <span className="text-[11px] text-muted-foreground font-medium">500 ({count500})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span className="text-[11px] text-muted-foreground font-medium">429 ({count429})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[11px] text-muted-foreground font-medium">504 ({count504})</span>
            </div>
            {count400 > 0 && (
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
                <span className="text-[11px] text-muted-foreground font-medium">400 ({count400})</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="p-5 flex-1 flex flex-col justify-end">
          {!hasData ? (
            <div className="flex h-52 flex-col items-center justify-center text-center p-4 select-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground mb-2">
                <Search className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">No incident records</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No status code breaches in this range.</p>
            </div>
          ) : (
            <ChartContainer config={statusBreakdownConfig} className="h-56 w-full">
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
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(dataMax ? Math.ceil(dataMax * 1.25) : 5, 5)]}
                  tickCount={5}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="serverError"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="rateLimit"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="timeout"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="validationError"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

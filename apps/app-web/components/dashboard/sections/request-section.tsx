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
import { RequestMetricPoint, TimeRange, MetricSummary } from "../context/dashboard-types";
import { Activity, CheckCircle2, Search } from "lucide-react";

interface RequestSectionProps {
  data: RequestMetricPoint[];
  timeRange?: TimeRange;
  summary?: MetricSummary | null;
}

const throughputChartConfig = {
  success: {
    label: "Success",
    color: "#10b981",
  },
  failure: {
    label: "Failure",
    color: "#f87171",
  },
} satisfies ChartConfig;

const reliabilityChartConfig = {
  successRate: {
    label: "Success Rate",
    color: "#10b981",
  },
} satisfies ChartConfig;

export function RequestSection({ data, timeRange = "24h", summary }: RequestSectionProps) {
  const windowSeconds = React.useMemo(() => {
    switch (timeRange) {
      case "1h":
        return 3600;
      case "24h":
        return 86400;
      case "7d":
        return 7 * 86400;
      case "30d":
        return 30 * 86400;
      default:
        return 3600;
    }
  }, [timeRange]);

  const totalSuccess = React.useMemo(
    () => summary?.total_success ?? data.reduce((acc, curr) => acc + curr.success, 0),
    [data, summary]
  );
  const totalFailure = React.useMemo(
    () => summary?.total_errors ?? data.reduce((acc, curr) => acc + curr.failure, 0),
    [data, summary]
  );
  const totalRequests = summary?.total_requests ?? (totalSuccess + totalFailure);

  const successRate = summary?.success_rate != null
    ? summary.success_rate.toFixed(1)
    : (totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(1) : "100.0");

  const rps = React.useMemo(() => {
    if (totalRequests === 0) return 0;
    return totalRequests / windowSeconds;
  }, [totalRequests, windowSeconds]);

  const rpsFormatted = React.useMemo(() => {
    if (totalRequests === 0) return "0.00";
    if (rps >= 100) return rps.toFixed(1);
    if (rps >= 1) return rps.toFixed(2);
    if (rps >= 0.01) return rps.toFixed(2);
    if (rps >= 0.001) return rps.toFixed(3);
    return "< 0.01";
  }, [rps, totalRequests]);

  const rateData = React.useMemo(() => {
    return data.map((d) => {
      const tot = d.total || (d.success + d.failure) || 0;
      const rate = tot > 0 ? Number(((d.success / tot) * 100).toFixed(1)) : 100.0;
      return {
        time: d.time,
        successRate: rate,
        total: tot,
      };
    });
  }, [data]);

  const hasData = data && data.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Component 1: Request Throughput */}
      <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-blue-500/30 hover:shadow-md">
        {/* Simplified Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-card/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-background text-blue-500 shadow-xs">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Request Throughput
              </h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">{rpsFormatted}</span>
                <span className="text-xs font-semibold text-blue-500 font-mono">req/s</span>
                <span className="text-xs text-muted-foreground font-mono ml-1">
                  ({totalRequests.toLocaleString()} total)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span className="text-[11px] text-muted-foreground font-medium">Success</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#f87171]" />
              <span className="text-[11px] text-muted-foreground font-medium">Failure</span>
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
              <p className="text-xs font-semibold text-foreground">No throughput records</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No requests received in this time range.</p>
            </div>
          ) : (
            <ChartContainer config={throughputChartConfig} className="h-56 w-full">
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
                  dataKey="success"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="failure"
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </Card>

      {/* Component 2: Success Rate */}
      <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md">
        {/* Simplified Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-card/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-background text-emerald-500 shadow-xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Success Rate
              </h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-emerald-500">{successRate}%</span>
                <span className="text-xs text-muted-foreground font-mono ml-1">
                  ({totalFailure.toLocaleString()} errors)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span className="text-[11px] text-muted-foreground font-medium">Rate %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-xs bg-[#3b82f6]" />
              <span className="text-[11px] text-muted-foreground font-medium">SLO 99%</span>
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
              <p className="text-xs font-semibold text-foreground">No reliability metrics</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No executions recorded in this window.</p>
            </div>
          ) : (
            <ChartContainer config={reliabilityChartConfig} className="h-56 w-full">
              <LineChart data={rateData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
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
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                />
                <ReferenceLine
                  y={99}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "SLO 99%",
                    fill: "#3b82f6",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="successRate"
                  stroke="#10b981"
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

"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
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
import { ErrorMetricPoint } from "../dashboard-types";
import { AlertCircle, ShieldAlert, TrendingDown } from "lucide-react";

interface ErrorSectionProps {
  data: ErrorMetricPoint[];
}

const chartConfig = {
  rateLimit: {
    label: "429 Rate Limits",
    color: "#3b82f6",
  },
  timeout: {
    label: "504 Gateway Timeouts",
    color: "#60a5fa",
  },
  serverError: {
    label: "500 Agent Errors",
    color: "#93c5fd",
  },
  validationError: {
    label: "400 Schema Failures",
    color: "#1d4ed8",
  },
} satisfies ChartConfig;

export function ErrorSection({ data }: ErrorSectionProps) {
  const latestErrorRate = data.length > 0 ? data[data.length - 1]?.errorRate : 0.73;
  const totalErrors = React.useMemo(
    () =>
      data.reduce(
        (acc, curr) =>
          acc + curr.timeout + curr.rateLimit + curr.serverError + curr.validationError,
        0
      ),
    [data]
  );

  return (
    <Card className="overflow-hidden border border-[#1e293b] bg-black shadow-xl">
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Metric Numbers & Stats */}
        <div className="flex w-full flex-col justify-between border-b border-[#1e293b] p-6 lg:w-80 lg:border-b-0 lg:border-r shrink-0">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1e293b] bg-black text-blue-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Failure & Errors
                </span>
              </div>
              <span className="flex items-center gap-1 rounded border border-blue-900/60 bg-blue-950/40 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                <ShieldAlert className="h-3 w-3 text-blue-400" />
                &lt;1.0% SLO
              </span>
            </div>

            {/* Big Primary Metric Number */}
            <div className="mt-4">
              <div className="text-4xl font-bold tracking-tight text-white font-mono">
                {latestErrorRate} <span className="text-xl text-blue-400 font-sans font-medium">%</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-400">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>-0.15% reduction vs baseline</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              HTTP error codes and agent execution faults recorded by telemetry probes.
            </p>
          </div>

          {/* Breakdown Badges */}
          <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#1e293b] pt-4">
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">429 Rate Limits</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#3b82f6]">
                {data.reduce((a, c) => a + c.rateLimit, 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">504 Timeouts</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#60a5fa]">
                {data.reduce((a, c) => a + c.timeout, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Error Bar Graph */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between pb-3">
            <div className="text-xs font-medium text-slate-300">
              Error Incident Breakdown By Category (Bar Graph)
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
                <span className="text-slate-400">429</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#60a5fa]" />
                <span className="text-slate-400">504</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#93c5fd]" />
                <span className="text-slate-400">500</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#1d4ed8]" />
                <span className="text-slate-400">400</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                    return val;
                  }}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="rateLimit" stackId="a" fill="#3b82f6" />
                <Bar dataKey="timeout" stackId="a" fill="#60a5fa" />
                <Bar dataKey="serverError" stackId="a" fill="#93c5fd" />
                <Bar dataKey="validationError" stackId="a" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

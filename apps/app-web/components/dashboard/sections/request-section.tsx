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
import { RequestMetricPoint } from "../dashboard-types";
import { Activity, ArrowUpRight, CheckCircle2 } from "lucide-react";

interface RequestSectionProps {
  data: RequestMetricPoint[];
}

const chartConfig = {
  success: {
    label: "Successful Requests",
    color: "#3b82f6",
  },
  failure: {
    label: "Failed Requests",
    color: "#93c5fd",
  },
} satisfies ChartConfig;

export function RequestSection({ data }: RequestSectionProps) {
  const totalSuccess = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.success, 0),
    [data]
  );
  const totalFailure = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.failure, 0),
    [data]
  );
  const totalRequests = totalSuccess + totalFailure;
  const successRate = totalRequests > 0
    ? ((totalSuccess / totalRequests) * 100).toFixed(2)
    : "100.00";

  return (
    <Card className="overflow-hidden border border-[#1e293b] bg-black shadow-xl">
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Metric Numbers & Stats */}
        <div className="flex w-full flex-col justify-between border-b border-[#1e293b] p-6 lg:w-80 lg:border-b-0 lg:border-r shrink-0">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1e293b] bg-black text-blue-400">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Total Requests
                </span>
              </div>
              <span className="flex items-center gap-1 rounded border border-blue-900/60 bg-blue-950/40 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                <CheckCircle2 className="h-3 w-3 text-blue-400" />
                {successRate}% Success
              </span>
            </div>

            {/* Big Primary Metric Number */}
            <div className="mt-4">
              <div className="text-4xl font-bold tracking-tight text-white font-mono">
                {totalRequests >= 1000000
                  ? `${(totalRequests / 1000000).toFixed(2)}M`
                  : totalRequests.toLocaleString()}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>+14.2% (+382k) vs last period</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Volume of incoming traces and execution invocations across all telemetry endpoints.
            </p>
          </div>

          {/* Breakdown Badges */}
          <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#1e293b] pt-4">
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">Successful</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#3b82f6]">
                {totalSuccess.toLocaleString()}
              </div>
            </div>
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">Failed</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#93c5fd]">
                {totalFailure.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Request Bar Graph */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between pb-3">
            <div className="text-xs font-medium text-slate-300">
              Request Throughput Over Time (Bar Graph)
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
                <span className="text-slate-400">Success</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#93c5fd]" />
                <span className="text-slate-400">Failure</span>
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
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return val;
                  }}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="success"
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="failure"
                  fill="#93c5fd"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LatencyMetricPoint } from "../context/dashboard-types";
import { Clock, ShieldCheck } from "lucide-react";

interface LatencyChartProps {
  data: LatencyMetricPoint[];
}

const chartConfig = {
  p50: {
    label: "P50 Median",
    color: "#60a5fa",
  },
  p90: {
    label: "P90 Percentile",
    color: "#3b82f6",
  },
  p99: {
    label: "P99 Tail Latency",
    color: "#93c5fd",
  },
} satisfies ChartConfig;

export function LatencyChart({ data }: LatencyChartProps) {
  const avgP50 = React.useMemo(
    () => Math.round(data.reduce((acc, curr) => acc + curr.p50, 0) / (data.length || 1)),
    [data]
  );
  const maxP99 = React.useMemo(
    () => Math.max(...data.map((d) => d.p99)),
    [data]
  );

  return (
    <Card className="border-[#1e293b] bg-black shadow-xl backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-base font-semibold text-slate-100">
              Response Time Percentiles
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400 mt-0.5">
            P50, P90, and P99 response time percentiles over time (ms)
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">P50 Avg</div>
            <div className="text-sm font-semibold text-blue-400">{avgP50} ms</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-blue-900/60 bg-blue-950/40 px-2.5 py-1 text-xs text-blue-300">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>SLA 300ms</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}ms`}
            />
            <ReferenceLine
              y={300}
              stroke="#1e40af"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "SLA Limit (300ms)",
                fill: "#60a5fa",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            <ChartTooltip
              cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "2 2" }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3 text-xs">
                      <span className="text-slate-400">{name}:</span>
                      <span className="font-semibold text-blue-300 font-mono">{value} ms</span>
                    </div>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#60a5fa", fill: "#030712" }}
            />
            <Line
              type="monotone"
              dataKey="p90"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#3b82f6", fill: "#030712" }}
            />
            <Line
              type="monotone"
              dataKey="p99"
              stroke="#93c5fd"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              activeDot={{ r: 4, stroke: "#93c5fd", fill: "#030712" }}
            />
          </LineChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-between border-t border-[#1e293b] pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#60a5fa]" />
              <span className="text-slate-300">P50 (Median)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-slate-300">P90 (90th)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#93c5fd]" />
              <span className="text-slate-300">P99 (Tail)</span>
            </div>
          </div>
          <div className="text-slate-400">
            Peak P99: <span className="text-blue-300 font-semibold">{maxP99} ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

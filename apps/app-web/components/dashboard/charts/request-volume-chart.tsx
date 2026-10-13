"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { RequestMetricPoint } from "../context/dashboard-types";
import { Activity, ArrowUpRight } from "lucide-react";

interface RequestVolumeChartProps {
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

export function RequestVolumeChart({ data }: RequestVolumeChartProps) {
  const totalSuccess = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.success, 0),
    [data]
  );
  const totalFailure = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.failure, 0),
    [data]
  );
  const successRate = totalSuccess + totalFailure > 0 
    ? ((totalSuccess / (totalSuccess + totalFailure)) * 100).toFixed(2) 
    : "100.00";

  return (
    <Card className="rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-xl backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Request Volume & Throughput
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total incoming traces partitioned by execution status
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">Success Rate</div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono">{successRate}%</div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs text-blue-700 dark:text-blue-300">
            <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-mono">{(totalSuccess + totalFailure).toLocaleString()} total</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillFailure" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
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
              tickFormatter={(val) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                return val;
              }}
            />
            <ChartTooltip
              cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "2 2" }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              type="monotone"
              dataKey="success"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#fillSuccess)"
            />
            <Area
              type="monotone"
              dataKey="failure"
              stroke="#93c5fd"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#fillFailure)"
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 dark:border-[#1e293b] pt-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-slate-700 dark:text-slate-300">Success</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">{totalSuccess.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#93c5fd]" />
              <span className="text-slate-700 dark:text-slate-300">Failure / Errors</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">{totalFailure.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium font-mono">
            <span>Peak: {Math.max(...(data.map(d => d.total) || [0])).toLocaleString()} req</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
import { CpuMetricPoint } from "../dashboard-types";
import { Cpu, HardDrive } from "lucide-react";

interface CpuUsageChartProps {
  data: CpuMetricPoint[];
}

const chartConfig = {
  cpuPercent: {
    label: "CPU Usage %",
    color: "#3b82f6",
  },
  memoryPercent: {
    label: "Memory Footprint %",
    color: "#93c5fd",
  },
} satisfies ChartConfig;

export function CpuUsageChart({ data }: CpuUsageChartProps) {
  const latestCpu = data.length > 0 ? data[data.length - 1]?.cpuPercent : 38;
  const latestMem = data.length > 0 ? data[data.length - 1]?.memoryPercent : 51;
  const latestLoad = data.length > 0 ? data[data.length - 1]?.coreLoad : 6.0;

  return (
    <Card className="border-[#1e293b] bg-black shadow-xl backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-base font-semibold text-slate-100">
              Compute & System Utilization
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400 mt-0.5">
            Host node CPU core utilization & memory footprint saturation
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Load (15m)</div>
            <div className="text-sm font-semibold text-blue-400">{latestLoad}</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-blue-900/60 bg-blue-950/40 px-2.5 py-1 text-xs text-blue-300">
            <HardDrive className="h-3.5 w-3.5 text-blue-400" />
            <span>16 Cores / 32GB</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillMem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.0} />
              </linearGradient>
            </defs>
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
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <ChartTooltip
              cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "2 2" }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3 text-xs">
                      <span className="text-slate-400">{name}:</span>
                      <span className="font-semibold text-blue-300 font-mono">{value}%</span>
                    </div>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="cpuPercent"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#fillCpu)"
            />
            <Area
              type="monotone"
              dataKey="memoryPercent"
              stroke="#93c5fd"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#fillMem)"
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-between border-t border-[#1e293b] pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-slate-300">CPU:</span>
              <span className="font-semibold text-slate-100">{latestCpu}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#93c5fd]" />
              <span className="text-slate-300">Memory:</span>
              <span className="font-semibold text-slate-100">{latestMem}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">GC Pause:</span>
            <span className="text-blue-300 font-mono">1.2ms (avg)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

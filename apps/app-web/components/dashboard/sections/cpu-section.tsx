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
import { CpuMetricPoint } from "../context/dashboard-types";
import { Cpu, HardDrive } from "lucide-react";

interface CpuSectionProps {
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

export function CpuSection({ data }: CpuSectionProps) {
  const latestCpu = data.length > 0 ? (data[data.length - 1]?.cpuPercent ?? 0) : 0;
  const latestMem = data.length > 0 ? (data[data.length - 1]?.memoryPercent ?? 0) : 0;
  const latestLoad = data.length > 0 ? (data[data.length - 1]?.coreLoad ?? 0) : 0;

  return (
    <Card className="overflow-hidden border border-[#1e293b] bg-black shadow-xl">
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Metric Numbers & Stats */}
        <div className="flex w-full flex-col justify-between border-b border-[#1e293b] p-6 lg:w-80 lg:border-b-0 lg:border-r shrink-0">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1e293b] bg-black text-blue-400">
                  <Cpu className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  CPU & Compute
                </span>
              </div>
            </div>

            {/* Big Primary Metric Number */}
            <div className="mt-4">
              <div className="text-4xl font-bold tracking-tight text-white font-mono">
                {latestCpu} <span className="text-xl text-blue-400 font-sans font-medium">%</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-400 font-mono">
                <span>Load Avg: {latestLoad}</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Host compute resource allocation and agent process memory pressure.
            </p>
          </div>

          {/* Breakdown Badges */}
          <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#1e293b] pt-4">
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">Memory Usage</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#93c5fd]">
                {latestMem}%
              </div>
            </div>
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">ClickHouse Sync</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#3b82f6]">
                Active
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: CPU Bar Graph */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between pb-3">
            <div className="text-xs font-medium text-slate-300">
              CPU & Memory Utilization Profile (Bar Graph)
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
                <span className="text-slate-400">CPU Core %</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#93c5fd]" />
                <span className="text-slate-400">Memory %</span>
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
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
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
                <Bar dataKey="cpuPercent" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="memoryPercent" fill="#93c5fd" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

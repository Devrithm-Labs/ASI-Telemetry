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
import { CpuMetricPoint } from "../context/dashboard-types";
import { Cpu, HardDrive } from "lucide-react";

interface CpuUsageChartProps {
  data: CpuMetricPoint[];
}

const chartConfig = {
  cpuPercent: {
    label: "CPU Usage %",
    color: "var(--foreground)",
  },
  memoryPercent: {
    label: "Memory Footprint %",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

export function CpuUsageChart({ data }: CpuUsageChartProps) {
  const latestCpu = data.length > 0 ? data[data.length - 1]?.cpuPercent : 38;
  const latestMem = data.length > 0 ? data[data.length - 1]?.memoryPercent : 51;
  const latestLoad = data.length > 0 ? data[data.length - 1]?.coreLoad : 6.0;

  return (
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold text-foreground">
              Compute & System Utilization
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Host node CPU core utilization & memory footprint saturation
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Load (15m)</div>
            <div className="text-sm font-semibold text-foreground font-mono">{latestLoad}</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-foreground font-medium">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono">16 Cores / 32GB</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillMem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "2 2" }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">{name}:</span>
                      <span className="font-semibold text-foreground font-mono">{value}%</span>
                    </div>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="cpuPercent"
              stroke="var(--foreground)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#fillCpu)"
            />
            <Area
              type="monotone"
              dataKey="memoryPercent"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#fillMem)"
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span className="text-foreground">CPU:</span>
              <span className="font-semibold text-foreground font-mono">{latestCpu}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">Memory:</span>
              <span className="font-semibold text-foreground font-mono">{latestMem}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">GC Pause:</span>
            <span className="text-foreground font-mono">1.2ms (avg)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

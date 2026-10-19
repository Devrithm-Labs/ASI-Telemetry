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
    color: "var(--foreground)",
  },
  failure: {
    label: "Failed Requests",
    color: "var(--muted-foreground)",
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
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-foreground" />
            <CardTitle className="text-base font-semibold text-foreground">
              Request Volume & Throughput
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Total incoming traces partitioned by execution status
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Success Rate</div>
            <div className="text-sm font-semibold text-foreground font-mono">{successRate}%</div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-foreground font-medium">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono">{(totalSuccess + totalFailure).toLocaleString()} total</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillFailure" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(val) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                return val;
              }}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "2 2" }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              type="monotone"
              dataKey="success"
              stroke="var(--foreground)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#fillSuccess)"
            />
            <Area
              type="monotone"
              dataKey="failure"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#fillFailure)"
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span className="text-foreground">Success</span>
              <span className="font-semibold text-foreground font-mono">{totalSuccess.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">Failure / Errors</span>
              <span className="font-semibold text-foreground font-mono">{totalFailure.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-foreground font-medium font-mono">
            <span>Peak: {Math.max(...(data.map(d => d.total) || [0])).toLocaleString()} req</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
    color: "var(--foreground)",
  },
  p90: {
    label: "P90 Percentile",
    color: "var(--muted-foreground)",
  },
  p99: {
    label: "P99 Tail Latency",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

export function LatencyChart({ data }: LatencyChartProps) {
  const avgP50 = React.useMemo(
    () => Math.round(data.reduce((acc, curr) => acc + (curr.p50 ?? 0), 0) / (data.length || 1)),
    [data]
  );
  const maxP99 = React.useMemo(
    () => (data.length > 0 ? Math.max(...data.map((d) => d.p99 ?? 0)) : 0),
    [data]
  );

  return (
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold text-foreground">
              Response Time Percentiles
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            P50, P90, and P99 response time percentiles over time (ms)
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">P50 Avg</div>
            <div className="text-sm font-semibold text-foreground font-mono">{avgP50} ms</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-foreground font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span>SLA 300ms</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              tickFormatter={(val) => `${val}ms`}
            />
            <ReferenceLine
              y={300}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "SLA Limit (300ms)",
                fill: "var(--muted-foreground)",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "2 2" }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">{name}:</span>
                      <span className="font-semibold text-foreground font-mono">{value} ms</span>
                    </div>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="p90"
              stroke="var(--muted-foreground)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="p99"
              stroke="var(--muted-foreground)"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span className="text-foreground">P50 (Median)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">P90 (90th)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="text-muted-foreground">P99 (Tail)</span>
            </div>
          </div>
          <div className="text-muted-foreground font-mono">
            Peak P99: <span className="text-foreground font-semibold">{maxP99} ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

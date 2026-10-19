"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
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
import { ErrorMetricPoint } from "../context/dashboard-types";
import { AlertCircle, ShieldAlert } from "lucide-react";

interface ErrorRateChartProps {
  data: ErrorMetricPoint[];
}

const chartConfig = {
  rateLimit: {
    label: "429 Rate Limits",
    color: "var(--foreground)",
  },
  timeout: {
    label: "504 Gateway Timeouts",
    color: "var(--muted-foreground)",
  },
  serverError: {
    label: "500 Agent Errors",
    color: "var(--muted-foreground)",
  },
  validationError: {
    label: "400 Schema Failures",
    color: "var(--border)",
  },
} satisfies ChartConfig;

export function ErrorRateChart({ data }: ErrorRateChartProps) {
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
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold text-foreground">
              Error & Failure Analysis
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Error incident breakdown by HTTP status code & execution faults
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Current Error Rate</div>
            <div className="text-sm font-semibold text-foreground font-mono">
              {latestErrorRate}%
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-foreground font-medium">
            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono">{totalErrors.toLocaleString()} Incidents</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                return val;
              }}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="rateLimit"
              stackId="a"
              fill="var(--foreground)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="timeout"
              stackId="a"
              fill="var(--muted-foreground)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="serverError"
              stackId="a"
              fill="var(--muted-foreground)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="validationError"
              stackId="a"
              fill="var(--border)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span className="text-foreground">429 Rate Limits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">504 Timeouts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">500 Agent Errors</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="text-muted-foreground">400 Validation</span>
            </div>
          </div>
          <div className="text-xs text-foreground font-medium font-mono">
            Threshold: &lt; 2.0% SLA
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

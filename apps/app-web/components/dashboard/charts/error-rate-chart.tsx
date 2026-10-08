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
import { ErrorMetricPoint } from "../dashboard-types";
import { AlertCircle, ShieldAlert } from "lucide-react";

interface ErrorRateChartProps {
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
    <Card className="border-[#1e293b] bg-black shadow-xl backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-base font-semibold text-slate-100">
              Error & Failure Analysis
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400 mt-0.5">
            Error incident breakdown by HTTP status code & execution faults
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">Current Error Rate</div>
            <div className="text-sm font-semibold text-blue-400">
              {latestErrorRate}%
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-blue-900/60 bg-blue-950/40 px-2.5 py-1 text-xs text-blue-300">
            <ShieldAlert className="h-3.5 w-3.5 text-blue-400" />
            <span>{totalErrors.toLocaleString()} Incidents</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              tickFormatter={(val) => {
                if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                return val;
              }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="rateLimit"
              stackId="a"
              fill="#3b82f6"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="timeout"
              stackId="a"
              fill="#60a5fa"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="serverError"
              stackId="a"
              fill="#93c5fd"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="validationError"
              stackId="a"
              fill="#1d4ed8"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-between border-t border-[#1e293b] pt-3 text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-slate-300">429 Rate Limits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#60a5fa]" />
              <span className="text-slate-300">504 Timeouts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#93c5fd]" />
              <span className="text-slate-300">500 Agent Errors</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#1d4ed8]" />
              <span className="text-slate-300">400 Validation</span>
            </div>
          </div>
          <div className="text-xs text-blue-400 font-medium">
            Threshold: &lt; 2.0% SLA
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

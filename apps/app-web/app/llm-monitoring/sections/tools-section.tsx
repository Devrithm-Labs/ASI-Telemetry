"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonitoringChartCard } from "../components/chart-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const TOOL_PALETTE = ["#3b82f6", "#f59e0b", "#10b981", "#a855f7", "#ec4899", "#06b6d4"];

interface ToolsSectionProps {
  collapsed: boolean;
  onToggle: () => void;
  toolNames: string[];
  toolsCountData: Array<Record<string, any>>;
  toolsLatencyData: Array<Record<string, any>>;
}

export function ToolsSection({
  collapsed,
  onToggle,
  toolNames,
  toolsCountData,
  toolsLatencyData,
}: ToolsSectionProps) {
  const hasData = toolNames.length > 0 && toolsCountData.length > 0;

  const chartConfig = React.useMemo(() => {
    const cfg: ChartConfig = {};
    toolNames.forEach((name, idx) => {
      cfg[name] = {
        label: name,
        color: TOOL_PALETTE[idx % TOOL_PALETTE.length],
      };
    });
    return cfg;
  }, [toolNames]);

  const legend = React.useMemo(() => {
    return toolNames.map((name, idx) => ({
      label: name,
      color: TOOL_PALETTE[idx % TOOL_PALETTE.length]!,
    }));
  }, [toolNames]);

  return (
    <section id="section-tools" className="space-y-4">
      <div
        onClick={onToggle}
        className="group flex cursor-pointer items-center justify-between border-b border-border/80 pb-2.5 select-none"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground group-hover:text-blue-500 transition-colors flex items-center gap-1.5">
            <span>Tools</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                collapsed ? "-rotate-90" : "rotate-0"
              )}
            />
          </h2>
          <span className="text-xs text-muted-foreground font-normal">
            — Sub-agent tool executions and function calls
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          {toolNames.length} {toolNames.length === 1 ? "tool" : "tools"} detected
        </span>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Run Count by Tool */}
          <MonitoringChartCard
            title="Run Count by Tool"
            subtitle="Tool invocation frequency over time"
            legend={legend}
            empty={!hasData}
            emptyTitle="No tool invocations recorded"
          >
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <LineChart data={toolsCountData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {toolNames.map((tool, idx) => (
                  <Line
                    key={tool}
                    type="monotone"
                    dataKey={tool}
                    stroke={TOOL_PALETTE[idx % TOOL_PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>

          {/* 2. Median Latency by Tool */}
          <MonitoringChartCard
            title="Median Latency by Tool"
            subtitle="Median latency by tool over time"
            legend={legend}
            empty={!hasData}
            emptyTitle="No tool latency records found"
          >
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <LineChart data={toolsLatencyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={true} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} unit="s" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {toolNames.map((tool, idx) => (
                  <Line
                    key={tool}
                    type="monotone"
                    dataKey={tool}
                    stroke={TOOL_PALETTE[idx % TOOL_PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </MonitoringChartCard>
        </div>
      )}
    </section>
  );
}

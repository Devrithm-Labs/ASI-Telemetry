"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function EmptyChartState({
  title = "No charting data found",
  subtitle = "No database telemetry records matched this metric bucket.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex h-56 flex-col items-center justify-center text-center p-6 select-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-400 mb-3 shadow-inner">
        <Search className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-300 tracking-tight">{title}</p>
      <p className="text-xs text-slate-500 max-w-xs mt-1">{subtitle}</p>
    </div>
  );
}

export interface MonitoringChartCardProps {
  title: string;
  subtitle: string;
  legend?: Array<{ label: string; color: string }>;
  badge?: string;
  children?: React.ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  className?: string;
}

export function MonitoringChartCard({
  title,
  subtitle,
  legend,
  badge,
  children,
  empty = false,
  emptyTitle,
  className,
}: MonitoringChartCardProps) {
  return (
    <Card
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:border-foreground/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            <span>{title}</span>
            {badge && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground font-mono border border-border">
                {badge}
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
        </div>

        {legend && legend.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 text-xs shrink-0">
            {legend.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full pt-1">
        {empty ? <EmptyChartState title={emptyTitle} /> : children}
      </div>
    </Card>
  );
}

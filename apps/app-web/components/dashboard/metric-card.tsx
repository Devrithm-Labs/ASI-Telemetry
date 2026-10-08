"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  trendText?: string;
}

export function MetricCard({
  title,
  value,
  change,
  isPositive = true,
  subtitle,
  icon,
  badge,
  trendText,
}: MetricCardProps) {
  return (
    <Card className="group relative overflow-hidden border-[#1e293b] bg-black p-0 shadow-lg transition-all duration-200 hover:border-blue-500/50 hover:shadow-blue-950/20">
      {/* Subtle top glowing blue border highlight */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">{title}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1e293b] bg-black text-blue-400 group-hover:border-blue-500/40 group-hover:text-blue-300 transition-colors">
            {icon}
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-bold tracking-tight text-slate-100">
            {value}
          </div>
          {badge && (
            <span className="rounded border border-blue-900/60 bg-blue-950/50 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1 font-medium">
            {change && (
              <span
                className={`inline-flex items-center gap-0.5 ${
                  isPositive ? "text-blue-400" : "text-slate-400"
                }`}
              >
                {isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {change}
              </span>
            )}
            {trendText && <span className="text-slate-500">{trendText}</span>}
          </div>
          {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

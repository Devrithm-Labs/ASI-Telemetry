"use client";

import * as React from "react";
import { BrainCircuit, Coins, Hash, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LLMMetricsSummary } from "../types";

export function KPISummaryStrip({ summary }: { summary: LLMMetricsSummary }) {
  const errorPct = summary.totalCount > 0 ? (100 - summary.successRate).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total No of Traces */}
      <Card className="border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total No of Traces
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <BrainCircuit className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">
          {summary.totalCount.toLocaleString()} {summary.totalCount === 1 ? "trace" : "traces"}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>ClickHouse Synced</span>
          <span className="text-foreground font-medium">All Spans</span>
        </div>
      </Card>

      {/* 2. Total Tokens */}
      <Card className="border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Tokens
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <Hash className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">
          {summary.totalTokens.toLocaleString()}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Prompt: {summary.promptTokens.toLocaleString()}</span>
          <span>Completion: {summary.completionTokens.toLocaleString()}</span>
        </div>
      </Card>

      {/* 3. Total Cost */}
      <Card className="border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Cost
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <Coins className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">
          ${summary.totalCost.toFixed(4)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Inference Spend</span>
          <span className="text-foreground font-medium">Recorded</span>
        </div>
      </Card>

      {/* 4. Success and Error Rate */}
      <Card className="border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Success & Error Rate
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2 text-2xl font-bold font-mono tracking-tight">
          <span className="text-foreground">{summary.successRate}%</span>
          <span className="text-xs font-sans font-medium text-muted-foreground">succ</span>
          <span className="text-muted-foreground/30 font-light">/</span>
          <span className={cn(summary.errorCount > 0 ? "text-destructive" : "text-muted-foreground")}>
            {errorPct}%
          </span>
          <span className="text-xs font-sans font-medium text-muted-foreground">err</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-foreground font-medium">{summary.successCount} Successful</span>
          <span className={cn(summary.errorCount > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>
            {summary.errorCount} Errored
          </span>
        </div>
      </Card>
    </div>
  );
}

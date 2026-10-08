"use client"

import * as React from "react"
import Link from "next/link"
import {
  Coins,
  Cpu,
  Clock,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ExternalLink,
  Flame,
  Zap,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { MOCK_KPIS, MOCK_TRACES } from "@/lib/api/mock-data"
import { telemetryApi } from "@/lib/api/client"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

// Mock timeseries for Latency & Tokens
const LATENCY_SERIES = [
  { time: "00:00", p50: 420, p95: 1480 },
  { time: "04:00", p50: 380, p95: 1290 },
  { time: "08:00", p50: 490, p95: 1680 },
  { time: "12:00", p50: 540, p95: 1980 },
  { time: "16:00", p50: 510, p95: 1840 },
  { time: "20:00", p50: 460, p95: 1590 },
]

const COST_BY_MODEL = [
  { model: "gpt-4o", cost: 28.4, tokens: 4.8 },
  { model: "claude-3-5-sonnet", cost: 19.8, tokens: 3.2 },
  { model: "deepseek-r1", cost: 11.2, tokens: 9.1 },
  { model: "embeddings", cost: 2.3, tokens: 2.2 },
]

export default function OverviewPage() {
  const [kpis, setKpis] = React.useState(MOCK_KPIS)

  React.useEffect(() => {
    let isMounted = true
    const fetchKPIs = async () => {
      try {
        const data = await telemetryApi.getOverviewKPIs()
        if (isMounted) setKpis(data)
      } catch (err) {
        console.error("Failed to load KPIs:", err)
      }
    }
    fetchKPIs()
    const interval = setInterval(fetchKPIs, 5000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const recentErrors = MOCK_TRACES.filter((t) => t.status === "error")
  const slowestTraces = [...MOCK_TRACES].sort((a, b) => b.durationMs - a.durationMs).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Top Banner: Focused Metrics Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Telemetry Overview
            <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
              agent-cluster-us-east
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key operational metrics: LLM spend, token burn, latency percentiles, uptime, and agent interactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/traces" />} className="h-8 text-xs gap-1.5">
            <span>Explore All Traces</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 5 Core KPI Cards: Cost, Tokens, Latency, Uptime, Interactions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. LLM Cost */}
        <Card className="p-3.5 flex flex-col justify-between border-border/80 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-[11px] uppercase tracking-wider">LLM Cost (24h)</span>
            <div className="h-7 w-7 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight font-mono">${kpis.totalCostUsd.toFixed(2)}</div>
            <div className="flex items-center gap-1.5 text-[11px] mt-1 text-emerald-500">
              <TrendingUp className="h-3 w-3" />
              <span>+{kpis.totalCostDeltaPct}% vs yesterday</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-2 pt-2 border-t border-border/50">
            Est. run-rate: $1,851 / mo
          </div>
        </Card>

        {/* 2. Token Count */}
        <Card className="p-3.5 flex flex-col justify-between border-border/80 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-[11px] uppercase tracking-wider">Token Count</span>
            <div className="h-7 w-7 rounded-md bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight font-mono">
              {(kpis.totalTokens / 1_000_000).toFixed(2)}M
            </div>
            <div className="flex items-center gap-1.5 text-[11px] mt-1 text-purple-400">
              <Zap className="h-3 w-3" />
              <span>+18.6% prompt / completion</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-2 pt-2 border-t border-border/50">
            Avg: 3,660 tokens / trace
          </div>
        </Card>

        {/* 3. Latency (p50 / p95) */}
        <Card className="p-3.5 flex flex-col justify-between border-border/80 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-[11px] uppercase tracking-wider">Latency (p50 / p95)</span>
            <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight font-mono">
              {kpis.p50LatencyMs}ms <span className="text-xs text-muted-foreground font-normal">/ {kpis.p95LatencyMs}ms</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] mt-1 text-emerald-500">
              <TrendingDown className="h-3 w-3" />
              <span>-12.1% faster latency</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-2 pt-2 border-t border-border/50">
            p99: 3,210ms
          </div>
        </Card>

        {/* 4. Uptime & Error Rate */}
        <Card className="p-3.5 flex flex-col justify-between border-border/80 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-[11px] uppercase tracking-wider">Uptime & SLO</span>
            <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight font-mono text-emerald-500">99.79%</div>
            <div className="flex items-center gap-1.5 text-[11px] mt-1 text-muted-foreground">
              <span>Error rate: <strong className="text-rose-500 font-mono">{(kpis.errorRate * 100).toFixed(1)}%</strong></span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-2 pt-2 border-t border-border/50">
            0 active critical incidents
          </div>
        </Card>

        {/* 5. Agent Interactions */}
        <Card className="p-3.5 flex flex-col justify-between border-border/80 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-[11px] uppercase tracking-wider">Interactions</span>
            <div className="h-7 w-7 rounded-md bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight font-mono">
              {kpis.totalTraces.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] mt-1 text-emerald-500">
              <TrendingUp className="h-3 w-3" />
              <span>+{kpis.totalTracesDeltaPct}% traces</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-2 pt-2 border-t border-border/50">
            18.4k tool & retriever calls
          </div>
        </Card>
      </div>

      {/* Charts Section: Latency Over Time & LLM Spend Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Percentiles Chart */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Latency Percentiles (ms)</CardTitle>
                <CardDescription className="text-xs">
                  Median p50 vs 95th percentile response times
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">p50 / p95</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={LATENCY_SERIES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={11} stroke="#888" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#888" tickFormatter={(v) => `${v}ms`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: 8, fontSize: 12 }}
                  formatter={(val: any, name: any) => [`${val}ms`, name === "p50" ? "p50 Latency" : "p95 Latency"]}
                />
                <Area type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#p95Grad)" />
                <Area type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#p50Grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost & Tokens By Model Chart */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">LLM Cost by Model ($)</CardTitle>
                <CardDescription className="text-xs">
                  Spend breakdown across frontier and open reasoning models
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/30">
                Spend ($)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COST_BY_MODEL} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="model" tickLine={false} axisLine={false} fontSize={11} stroke="#888" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#888" tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: 8, fontSize: 12 }}
                  formatter={(val: any) => [`$${val}`, "Cost (USD)"]}
                />
                <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Operational Tables: Recent Errors & Slowest Execution Traces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Errors */}
        <Card className="border-border/80">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Recent Failed Traces
                <Badge variant="outline" className="text-rose-500 border-rose-500/30 text-[10px]">
                  {recentErrors.length} detected
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Traces impacted by tool timeouts, API rate limits, or exceptions
              </CardDescription>
            </div>
            <Link href="/traces?status=error" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="divide-y divide-border/60">
              {recentErrors.map((trace) => (
                <div key={trace.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/traces/${trace.id}`}
                      className="text-xs font-semibold text-foreground hover:text-primary truncate block"
                    >
                      {trace.name}
                    </Link>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-primary/80">{trace.agentName}</span>
                      <span>•</span>
                      <span className="font-mono">{trace.durationMs}ms</span>
                    </div>
                  </div>
                  <StatusBadge status={trace.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Slowest Execution Traces */}
        <Card className="border-border/80">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Slowest Traces (High Latency)</CardTitle>
              <CardDescription className="text-xs">
                Executions exceeding latency thresholds
              </CardDescription>
            </div>
            <Link href="/traces" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="divide-y divide-border/60">
              {slowestTraces.map((trace) => (
                <div key={trace.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/traces/${trace.id}`}
                      className="text-xs font-semibold text-foreground hover:text-primary truncate block"
                    >
                      {trace.name}
                    </Link>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-primary/80">{trace.agentName}</span>
                      <span>•</span>
                      <span className="font-mono font-medium text-amber-500">{trace.durationMs}ms</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">${trace.totalCostUsd.toFixed(4)}</span>
                    </div>
                  </div>
                  <StatusBadge status={trace.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

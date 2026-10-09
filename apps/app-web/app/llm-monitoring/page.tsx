"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  BrainCircuit,
  Coins,
  Cpu,
  Gauge,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
  Clock,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/context/dashboard-context";
import { DashboardFilters, SubTabItem } from "@/components/dashboard/layout/filters";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// LLM specific dataset
const LLM_TOKEN_METRICS = [
  { time: "12:00", promptTokens: 320, completionTokens: 140, cost: 0.82 },
  { time: "13:00", promptTokens: 410, completionTokens: 190, cost: 1.15 },
  { time: "14:00", promptTokens: 580, completionTokens: 260, cost: 1.62 },
  { time: "15:00", promptTokens: 490, completionTokens: 210, cost: 1.34 },
  { time: "16:00", promptTokens: 670, completionTokens: 320, cost: 1.94 },
  { time: "17:00", promptTokens: 820, completionTokens: 410, cost: 2.45 },
  { time: "18:00", promptTokens: 910, completionTokens: 480, cost: 2.82 },
  { time: "19:00", promptTokens: 780, completionTokens: 390, cost: 2.31 },
  { time: "20:00", promptTokens: 850, completionTokens: 440, cost: 2.58 },
  { time: "21:00", promptTokens: 940, completionTokens: 520, cost: 3.05 },
  { time: "22:00", promptTokens: 710, completionTokens: 340, cost: 2.08 },
  { time: "23:00", promptTokens: 620, completionTokens: 290, cost: 1.76 },
];

const LLM_MODEL_LATENCY = [
  { model: "gpt-4o", p50: 165, p90: 280, p99: 410 },
  { model: "claude-3-5-sonnet", p50: 190, p90: 320, p99: 480 },
  { model: "gemini-1.5-pro", p50: 145, p90: 240, p99: 360 },
  { model: "deepseek-v3", p50: 210, p90: 360, p99: 520 },
  { model: "text-embed-3-lg", p50: 38, p90: 65, p99: 98 },
];

const LLM_RATE_LIMITS = [
  { time: "12:00", rateLimits: 0, retries: 2 },
  { time: "14:00", rateLimits: 1, retries: 4 },
  { time: "16:00", rateLimits: 3, retries: 8 },
  { time: "18:00", rateLimits: 4, retries: 12 },
  { time: "20:00", rateLimits: 2, retries: 6 },
  { time: "22:00", rateLimits: 1, retries: 3 },
];


const LLM_TABS: SubTabItem[] = [
  { id: "section-tokens", label: "Token Throughput", targetId: "section-tokens" },
  { id: "section-latency", label: "Model Latency", targetId: "section-latency" },
  { id: "section-cost", label: "Inference Cost ($)", targetId: "section-cost" },
  { id: "section-ratelimits", label: "Rate Limits (429)", targetId: "section-ratelimits" },
];

export default function LLMMonitoringPage() {
  const router = useRouter();
  const {
    selectedProject,
    setSelectedProject,
    timeRange,
    setTimeRange,
    isLive,
    setIsLive,
    handleRefresh,
    isRefreshing,
  } = useDashboard();

  const [activeSubTab, setActiveSubTab] = React.useState("section-tokens");
  const [selectedModel, setSelectedModel] = React.useState("All Models");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = React.useState(false);

  const models = [
    "All Models",
    "gpt-4o",
    "claude-3-5-sonnet",
    "gemini-1.5-pro",
    "deepseek-v3",
  ];

  return (
    <>
      <DashboardFilters
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        subTabs={LLM_TABS}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        routeCategory="Observability"
        routeTitle="LLM Monitoring"
        routeIcon={Bot}
        showLiveToggle={true}
        showTimeRange={true}
        showProjectSelector={true}
        extraControls={
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex h-7.5 items-center gap-1.5 rounded-md border border-[#1e293b] bg-black px-2.5 text-xs font-semibold text-slate-200 hover:border-blue-500/60 hover:text-white transition-colors"
            >
              <Bot className="h-3.5 w-3.5 text-blue-400" />
              <span>{selectedModel}</span>
            </button>

            {isModelDropdownOpen && (
              <div className="absolute right-0 top-9 z-50 w-44 rounded-md border border-[#1e293b] bg-[#090d16] py-1 shadow-2xl backdrop-blur-md">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-400">
                  Filter Model
                </div>
                {models.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedModel(m);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`flex w-full items-center px-2.5 py-1.5 text-xs transition-colors ${
                      selectedModel === m
                        ? "bg-blue-600/20 text-blue-300 font-semibold"
                        : "text-slate-300 hover:bg-[#141414] hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1e293b] bg-black text-blue-400">
                <Bot className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                LLM & Foundation Model Telemetry
              </h2>
              <span className="rounded-full border border-blue-900/60 bg-blue-950/40 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-300">
                4 Providers Active
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Live token throughput, model latency breakdowns, cost allocation, and rate-limit economics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md border border-[#1e293b] bg-black px-3 py-1.5 text-xs text-slate-300">
              <Sparkles className="h-3 w-3 text-blue-400" />
              <span>Optimized Model Routing: <span className="font-semibold text-blue-300">Enabled</span></span>
            </span>
          </div>
        </div>

        {/* Top LLM KPI Overview Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Total Tokens */}
          <Card className="border border-[#1e293b] bg-black p-4 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Tokens Streamed</span>
              <BrainCircuit className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">18.42M</div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Prompt: 11.2M</span>
              <span className="text-blue-300 font-mono">Comp: 7.2M</span>
            </div>
          </Card>

          {/* 2. Avg TTFT */}
          <Card className="border border-[#1e293b] bg-black p-4 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Time to First Token (TTFT)</span>
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">218 ms</div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>P90: 310ms</span>
              <span className="text-blue-300 font-semibold">SLA: 99.8%</span>
            </div>
          </Card>

          {/* 3. Incurred Cost */}
          <Card className="border border-[#1e293b] bg-black p-4 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Incurred Spend</span>
              <Coins className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">$54.20</div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Avg: $0.0029 / call</span>
              <span className="text-emerald-400 font-semibold">-4.1% cost</span>
            </div>
          </Card>

          {/* 4. Rate Limit Status */}
          <Card className="border border-[#1e293b] bg-black p-4 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Rate Limit Breaches (429)</span>
              <AlertOctagon className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">11 Events</div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Auto-retries: 100% ok</span>
              <span className="text-blue-300 font-semibold">Healthy</span>
            </div>
          </Card>
        </div>

        {/* Horizontal Section 1: Token Generation & Volume (Number + Bar Graph) */}
        <Card id="section-tokens" className="scroll-mt-6 border border-[#1e293b] bg-black p-5 shadow-xl hover:border-blue-500/40 transition-colors">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
            {/* Left prominent metric display */}
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#1e293b] pb-4 lg:pb-0 lg:pr-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Token Throughput</h3>
                  <p className="text-[11px] text-slate-400">Prompt vs Completion Breakdown</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                  18,420,119
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium mt-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+18.4% token volume over 7d</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e293b] text-xs">
                <div className="rounded-lg border border-[#1e293b] bg-[#080808] p-2.5">
                  <span className="text-[11px] text-slate-400">Prompt Tokens</span>
                  <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">11.2M (61%)</div>
                </div>
                <div className="rounded-lg border border-[#1e293b] bg-[#080808] p-2.5">
                  <span className="text-[11px] text-slate-400">Completion Tokens</span>
                  <div className="text-sm font-bold text-sky-300 font-mono mt-0.5">7.2M (39%)</div>
                </div>
              </div>
            </div>

            {/* Right Bar Graph */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-300">Hourly Token Ingestion (kTokens)</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <span className="text-[11px] text-slate-400">Prompt</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="text-[11px] text-slate-400">Completion</span>
                  </div>
                </div>
              </div>

              <div className="h-44 w-full">
                <ChartContainer
                  config={{
                    promptTokens: { label: "Prompt Tokens (k)", color: "#2563eb" },
                    completionTokens: { label: "Completion Tokens (k)", color: "#38bdf8" },
                  }}
                  className="h-full w-full"
                >
                  <BarChart data={LLM_TOKEN_METRICS} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />
                    <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="promptTokens" fill="#2563eb" radius={[4, 4, 0, 0]} stackId="tokens" />
                    <Bar dataKey="completionTokens" fill="#38bdf8" radius={[4, 4, 0, 0]} stackId="tokens" />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </Card>

        {/* Horizontal Section 2: Model Latency Breakdown (Number + Bar Graph) */}
        <Card id="section-latency" className="scroll-mt-6 border border-[#1e293b] bg-black p-5 shadow-xl hover:border-blue-500/40 transition-colors">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
            {/* Left metric display */}
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#1e293b] pb-4 lg:pb-0 lg:pr-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Model Latency Distribution</h3>
                  <p className="text-[11px] text-slate-400">P50 vs P90 Across Foundation Models</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                  165 ms
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Fastest: gemini-1.5-pro (145ms P50)</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#1e293b] text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Fastest TTFT</span>
                  <span className="font-semibold text-white font-mono">112 ms</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Inter-Token Latency</span>
                  <span className="font-semibold text-blue-300 font-mono">14.2 ms / token</span>
                </div>
              </div>
            </div>

            {/* Right Bar Graph */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-300">Latency by Model Family (ms)</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <span className="text-[11px] text-slate-400">P50</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="text-[11px] text-slate-400">P90</span>
                  </div>
                </div>
              </div>

              <div className="h-44 w-full">
                <ChartContainer
                  config={{
                    p50: { label: "P50 Latency (ms)", color: "#2563eb" },
                    p90: { label: "P90 Latency (ms)", color: "#38bdf8" },
                  }}
                  className="h-full w-full"
                >
                  <BarChart data={LLM_MODEL_LATENCY} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />
                    <XAxis dataKey="model" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="p50" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="p90" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </Card>

        {/* Horizontal Section 3: Incurred Cost & Economics (Number + Bar Graph) */}
        <Card id="section-cost" className="scroll-mt-6 border border-[#1e293b] bg-black p-5 shadow-xl hover:border-blue-500/40 transition-colors">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
            {/* Left metric display */}
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#1e293b] pb-4 lg:pb-0 lg:pr-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Inference Cost Spend</h3>
                  <p className="text-[11px] text-slate-400">Total API Billing Accumulation</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                  $54.20
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium mt-1">
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Under daily budget target ($80.00)</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#1e293b] text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>GPT-4o Spend</span>
                  <span className="font-semibold text-white font-mono">$31.40 (58%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Claude 3.5 Sonnet Spend</span>
                  <span className="font-semibold text-blue-300 font-mono">$18.10 (33%)</span>
                </div>
              </div>
            </div>

            {/* Right Bar Graph */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-300">Hourly Cost Accrual ($ USD)</span>
                <span className="text-[11px] text-blue-400 font-mono">Real-time Calculation</span>
              </div>

              <div className="h-44 w-full">
                <ChartContainer
                  config={{
                    cost: { label: "Hourly Spend ($)", color: "#2563eb" },
                  }}
                  className="h-full w-full"
                >
                  <BarChart data={LLM_TOKEN_METRICS} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />
                    <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="cost" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </Card>

        {/* Horizontal Section 4: Rate Limits & Status Codes */}
        <Card id="section-ratelimits" className="scroll-mt-6 border border-[#1e293b] bg-black p-5 shadow-xl hover:border-blue-500/40 transition-colors">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
            {/* Left metric display */}
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#1e293b] pb-4 lg:pb-0 lg:pr-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <AlertOctagon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Rate Limit Saturation (429)</h3>
                  <p className="text-[11px] text-slate-400">TPM / RPM Quota Tracking</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                  11
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Quota Saturation: 42% (Normal)</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#1e293b] text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Successful Auto-Retries</span>
                  <span className="font-semibold text-white font-mono">35 / 35 (100%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Backoff Avg Delay</span>
                  <span className="font-semibold text-blue-300 font-mono">1.2 seconds</span>
                </div>
              </div>
            </div>

            {/* Right Bar Graph */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-300">Rate Limit Events & Retries</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <span className="text-[11px] text-slate-400">429s</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="text-[11px] text-slate-400">Retries</span>
                  </div>
                </div>
              </div>

              <div className="h-44 w-full">
                <ChartContainer
                  config={{
                    rateLimits: { label: "429 Rate Limits", color: "#2563eb" },
                    retries: { label: "Automatic Retries", color: "#38bdf8" },
                  }}
                  className="h-full w-full"
                >
                  <BarChart data={LLM_RATE_LIMITS} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />
                    <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="rateLimits" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="retries" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}

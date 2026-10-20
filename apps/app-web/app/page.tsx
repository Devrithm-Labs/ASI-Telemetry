"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getStoredUser, getAuthToken } from "@/lib/auth";

export default function LandingPage() {
  const [currentUser, setCurrentUser] = React.useState<ReturnType<typeof getStoredUser>>(null);
  const [hasToken, setHasToken] = React.useState(false);
  const [copiedInstall, setCopiedInstall] = React.useState(false);
  const [copiedSnippet, setCopiedSnippet] = React.useState(false);
  const [codeTab, setCodeTab] = React.useState<"python" | "env">("python");

  React.useEffect(() => {
    setCurrentUser(getStoredUser());
    setHasToken(Boolean(getAuthToken()));
  }, []);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText("pip install asi-telemetry");
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const handleCopySnippet = () => {
    const code =
      codeTab === "python"
        ? `# 1. Install & import the tracer
from asi_telemetry import ASI_Telemetry

# 2. Initialize with your project API key
observe = ASI_Telemetry(api_key="asi_live_7a9f8b2c4e1d3f0a", agent_name="research_agent")

# 3. Decorate your agent reasoning or tool call
@observe.traceable(name="research_agent", run_type="agent")
def run_agent(query: str):
    # Automatic capture: prompt, tokens, latency, tool calls & errors
    response = call_llm(query)
    return response`
        : `# Environment variables (zero-code configuration)
export ASI_API_KEY="asi_live_7a9f8b2c4e1d3f0a"
export TELEMETRY_BACKEND_URL="http://localhost:8080"
export ASI_PROJECT="production-fleet"`;

    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-foreground selection:text-background">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-foreground">
                ASI:Telemetry
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-muted/40">
                v2.0
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#overview" className="hover:text-foreground transition-colors">
              Overview
            </a>
            <a href="#dashboard-preview" className="hover:text-foreground transition-colors">
              Dashboard
            </a>
            <a href="#sdk" className="hover:text-foreground transition-colors">
              Quickstart
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              Architecture
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {hasToken ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section id="overview" className="pt-16 pb-12 sm:pt-24 sm:pb-16 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Release Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/30 text-xs text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Production-grade telemetry for AI agents & LLMs</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.15] max-w-4xl mx-auto">
          Observability and traces for AI applications & agents.
        </h1>

        {/* Subhead */}
        <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
          Understand what your agents are doing in production. Trace step-by-step reasoning,
          monitor latency percentiles, and track token spend—backed by ClickHouse for real-time scale.
        </p>

        {/* CTA Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-foreground text-background font-medium text-sm hover:opacity-90 transition-all"
          >
            <span>Start Tracing Free</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-border bg-card hover:bg-muted/60 font-medium text-sm text-foreground transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <span>Live Console</span>
          </Link>
        </div>

        {/* Terminal Quick Install */}
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border bg-card font-mono text-xs text-muted-foreground shadow-2xs">
            <span className="text-foreground">$ pip install asi-telemetry</span>
            <button
              type="button"
              onClick={handleCopyInstall}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer pl-2 border-l border-border"
              title="Copy pip install command"
            >
              {copiedInstall ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Dashboard Statistics Showcase ──────────────────────────────── */}
      <section id="dashboard-preview" className="pb-20 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        {/* Application Window Frame */}
        <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Window Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-border" />
              <span className="h-3 w-3 rounded-full bg-border" />
              <span className="h-3 w-3 rounded-full bg-border" />
              <span className="ml-2 text-xs font-medium text-muted-foreground hidden sm:inline-block">
                asi-telemetry.io/analytics · Live Dashboard Statistics
              </span>
            </div>

            <div className="flex items-center gap-3">

              <Link
                href="/dashboard"
                className="text-xs text-foreground font-medium hover:underline flex items-center gap-1"
              >
                <span>Open in App</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Screenshot Image Container: dynamically switches between Light and Dark mode */}
          <div className="relative w-full aspect-[1917/1008] bg-muted/20">
            {/* Light Mode Dashboard Screenshot */}
            <div className="absolute inset-0 block dark:hidden">
              <Image
                src="/imagecopy.png"
                alt="ASI Telemetry Dashboard Overview - Tool Monitoring (Light Theme)"
                fill
                priority
                className="object-cover object-top"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
            {/* Dark Mode Dashboard Screenshot */}
            <div className="absolute inset-0 hidden dark:block">
              <Image
                src="/image1.png"
                alt="ASI Telemetry Dashboard Overview - LLM Monitoring (Dark Theme)"
                fill
                priority
                className="object-cover object-top"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          </div>

          {/* Highlights Footer Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border divide-y sm:divide-y-0 sm:divide-x divide-border bg-muted/10 text-left">
            <div className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground font-medium">Traces & Runs Tracked</div>
              <div className="text-xl font-bold font-mono text-foreground">157</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">ClickHouse Synced</div>
            </div>
            <div className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground font-medium">Total Tokens</div>
              <div className="text-xl font-bold font-mono text-foreground">63,325</div>
              <div className="text-[11px] text-muted-foreground">Prompt: 45k · Completion: 18k</div>
            </div>
            <div className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground font-medium">Recorded Cost</div>
              <div className="text-xl font-bold font-mono text-foreground">$0.0399</div>
              <div className="text-[11px] text-muted-foreground">Multi-Model Inference</div>
            </div>
            <div className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground font-medium">Success Rate</div>
              <div className="text-xl font-bold font-mono text-foreground">99.4%</div>
              <div className="text-[11px] text-muted-foreground">156 Successful / 1 Errored</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Proof Metrics ───────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/20 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              &lt; 0.2ms
            </div>
            <div className="text-xs text-muted-foreground mt-1">In-process tracer overhead</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              100%
            </div>
            <div className="text-xs text-muted-foreground mt-1">ClickHouse columnar analytics</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              p50 / p95 / p99
            </div>
            <div className="text-xs text-muted-foreground mt-1">Real-time latency percentiles</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              Zero-Lag
            </div>
            <div className="text-xs text-muted-foreground mt-1">Async non-blocking dispatch</div>
          </div>
        </div>
      </section>

      {/* ── SDK Integration Section ─────────────────────────────────────────── */}
      <section id="sdk" className="py-20 max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Instrument in three lines of Python
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            No complicated middleware or proxy servers. Decorate any agent function,
            prompt chain, or tool with zero performance penalty.
          </p>
        </div>

        <div className="max-w-3xl mx-auto rounded-xl border border-zinc-800 bg-black text-left overflow-hidden shadow-2xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-black">
            {/* Left: [PY] / [ENV] Badge + File Name */}
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 leading-none select-none">
                {codeTab === "python" ? "PY" : "ENV"}
              </span>
              <span className="text-xs font-mono text-zinc-300">
                {codeTab === "python" ? "agent.py" : ".env"}
              </span>
            </div>

            {/* Right: Language Selector + Copy Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCodeTab(codeTab === "python" ? "env" : "python")}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-sans cursor-pointer"
                title="Switch between Python and .env"
              >
                <span>{codeTab === "python" ? "Python" : "Shell / Env"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              </button>

              <button
                type="button"
                onClick={handleCopySnippet}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="Copy code"
                aria-label="Copy code"
              >
                {copiedSnippet ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Code Area */}
          <div className="p-6 font-mono text-xs sm:text-[13px] leading-relaxed bg-black text-zinc-200 overflow-x-auto selection:bg-zinc-800 selection:text-white">
            {codeTab === "python" ? (
              <pre className="font-mono text-xs sm:text-[13px] leading-6 sm:leading-7 text-zinc-200 whitespace-pre">
                <div><span className="text-zinc-500"># 1. Install &amp; import the tracer</span></div>
                <div><span className="text-[#f43f5e]">import</span> asi_telemetry</div>
                <div>&nbsp;</div>
                <div><span className="text-zinc-500"># 2. Initialize with your project API key</span></div>
                <div>asi_telemetry.<span className="text-[#38bdf8]">init</span>(api_key=<span className="text-[#4ade80]">&quot;asi_live_7a9f8b2c4e1d3f0a&quot;</span>)</div>
                <div>&nbsp;</div>
                <div><span className="text-zinc-500"># 3. Decorate your agent reasoning or tool call</span></div>
                <div><span className="text-[#f43f5e]">@</span>asi_telemetry.<span className="text-[#38bdf8]">traceable</span>(name=<span className="text-[#4ade80]">&quot;research_agent&quot;</span>, run_type=<span className="text-[#4ade80]">&quot;agent&quot;</span>)</div>
                <div><span className="text-[#f43f5e]">def</span> <span className="text-[#38bdf8]">run_agent</span>(query: <span className="text-[#38bdf8]">str</span>):</div>
                <div>    <span className="text-zinc-500"># Automatic capture: prompt, tokens, latency, tool calls &amp; errors</span></div>
                <div>    response = <span className="text-[#38bdf8]">call_llm</span>(query)</div>
                <div>    <span className="text-[#f43f5e]">return</span> response</div>
              </pre>
            ) : (
              <pre className="font-mono text-xs sm:text-[13px] leading-6 sm:leading-7 text-zinc-200 whitespace-pre">
                <div><span className="text-zinc-500"># Environment variables (zero-code configuration)</span></div>
                <div><span className="text-[#f43f5e]">export</span> ASI_API_KEY=<span className="text-[#4ade80]">&quot;asi_live_7a9f8b2c4e1d3f0a&quot;</span></div>
                <div><span className="text-[#f43f5e]">export</span> TELEMETRY_BACKEND_URL=<span className="text-[#4ade80]">&quot;http://localhost:8080&quot;</span></div>
                <div><span className="text-[#f43f5e]">export</span> ASI_PROJECT=<span className="text-[#4ade80]">&quot;production-fleet&quot;</span></div>
              </pre>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground max-w-3xl mx-auto px-1">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Non-blocking daemon worker flushes events asynchronously in batches</span>
          </span>
          <Link href="/api-keys" className="text-foreground hover:underline font-medium inline-flex items-center gap-1">
            <span>Manage API Keys</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────── */}
      <section id="features" className="py-16 border-t border-border bg-muted/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built specifically for LLM & agent workloads
            </h2>
            <p className="text-sm text-muted-foreground">
              Traditional application performance monitoring breaks down on recursive agent loops,
              tool invocations, and token-based pricing models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-border bg-card shadow-2xs space-y-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
                <Layers className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Hierarchical Trace Trees
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Connect parent agent decision chains to child tool calls, prompt expansions,
                and sub-agent delegates. Retain full context and causality across the entire lifecycle.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-border bg-card shadow-2xs space-y-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Latency Percentiles (p50 / p95 / p99)
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Stop relying on misleading average times. Directly query high-percentile latency
                distributions to pinpoint slow tools, unresponsive APIs, or model generation stalls.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-border bg-card shadow-2xs space-y-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Token & Cost Accounting
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Automatic calculation of prompt tokens, completion tokens, and real dollar costs
                for Gemini, OpenAI, Claude, and custom local models.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-border bg-card shadow-2xs space-y-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                ClickHouse Columnar Storage
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Fast queries over tens of millions of records. Partitioned by account and project
                so your queries stay responsive regardless of ingestion volume.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ── Bottom Call To Action ───────────────────────────────────────────── */}
      <section className="py-16 border-t border-border bg-muted/20 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Start observing your agent workflows today.
          </h2>
          <p className="text-sm text-muted-foreground">
            Sign up in seconds, generate your project API key, and begin monitoring traces and tokens.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-foreground text-background font-medium text-xs hover:opacity-90 transition-opacity"
            >
              <span>Create Free Account</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-md border border-border bg-card hover:bg-muted font-medium text-xs text-foreground transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background py-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>ClickHouse Telemetry: Operational</span>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/llm-monitoring" className="hover:text-foreground transition-colors">
              LLM Metrics
            </Link>
            <Link href="/llm-traces" className="hover:text-foreground transition-colors">
              Traces
            </Link>
            <Link href="/api-keys" className="hover:text-foreground transition-colors">
              API Keys
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} ASI:Telemetry.
          </div>
        </div>
      </footer>
    </div>
  );
}

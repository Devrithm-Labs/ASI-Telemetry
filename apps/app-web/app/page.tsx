"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  Database,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getStoredUser, getAuthToken } from "@/lib/auth";

export default function LandingPage() {
  const [currentUser, setCurrentUser] = React.useState<ReturnType<typeof getStoredUser>>(null);
  const [hasToken, setHasToken] = React.useState(false);
  const [copiedInstall, setCopiedInstall] = React.useState(false);
  const [copiedKeySnippet, setCopiedKeySnippet] = React.useState(false);
  const [activeCodeTab, setActiveCodeTab] = React.useState<"tracer" | "metrics" | "init">("tracer");

  React.useEffect(() => {
    setCurrentUser(getStoredUser());
    setHasToken(Boolean(getAuthToken()));
  }, []);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText("pip install asi-telemetry");
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const handleCopyKeySnippet = () => {
    const snippet = `export ASI_API_KEY="asi_live_7a9f8b2c4e1d3f0a"
export TELEMETRY_BACKEND_URL="http://localhost:8080"`;
    navigator.clipboard.writeText(snippet);
    setCopiedKeySnippet(true);
    setTimeout(() => setCopiedKeySnippet(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-foreground selection:text-background">
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-foreground">
                  ASI:Telemetry
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  v2.0
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground -mt-0.5 hidden sm:block">
                AI Observability & Trace Pipeline
              </span>
            </div>
          </Link>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#code-sample" className="hover:text-foreground transition-colors">
              Python SDK
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              Architecture
            </a>
            <Link href="/api-keys" className="hover:text-foreground transition-colors">
              API Keys
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {hasToken ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-medium px-3 py-1.5 rounded-md text-foreground hover:bg-muted transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
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
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
        {/* Subtle background ambient gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 backdrop-blur-xs text-xs font-medium text-foreground shadow-xs animate-in fade-in duration-500">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Multi-Tenant ClickHouse Telemetry for Autonomous AI Swarms</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.12]">
            Full-Stack Observability for{" "}
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Autonomous AI Agents
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
            Trace reasoning chains, step-by-step tool executions, LLM token costs,
            and sub-millisecond latency percentiles. Isolate data per account with granular
            scoped API keys.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:bg-primary/90 transition-all active:scale-98"
            >
              <Zap className="h-4 w-4 fill-current" />
              <span>Start Tracing Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted font-medium text-xs text-foreground transition-all"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Explore Live Console</span>
            </Link>
          </div>

          {/* Quick Pip Install Snippet */}
          <div className="pt-4 flex items-center justify-center">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border bg-card font-mono text-xs shadow-xs text-muted-foreground">
              <Terminal className="h-3.5 w-3.5 text-foreground" />
              <span className="text-foreground">$ pip install asi-telemetry</span>
              <button
                type="button"
                onClick={handleCopyInstall}
                className="ml-2 hover:text-foreground transition-colors p-1"
                title="Copy install command"
              >
                {copiedInstall ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value Strip (Key Metrics) ────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/40 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              &lt; 0.1ms
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Ingestion Dispatch Overhead
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              100%
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              ClickHouse Native Analytics
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              p50 / p95 / p99
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Latency Percentiles Computed
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              Scoped
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Account-Isolated API Keys
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Code Showcase ───────────────────────────────────────── */}
      <section id="code-sample" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Connect Any Python Agent in 2 Lines of Code
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Zero intrusive boilerplate. Non-blocking asynchronous threads send metrics
            and traces to your account via your secret API key.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Code Editor Card */}
          <div className="lg:col-span-7 rounded-xl border border-border bg-card shadow-md flex flex-col overflow-hidden">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("tracer")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeCodeTab === "tracer"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  @traceable (LLM)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("metrics")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeCodeTab === "metrics"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  @tracker.track (Tools)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("init")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeCodeTab === "init"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Env Config
                </button>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground pr-2">
                <span>python</span>
              </div>
            </div>

            {/* Code Body */}
            <div className="p-4 flex-1 font-mono text-xs overflow-x-auto leading-relaxed bg-card text-foreground/90 selection:bg-muted">
              {activeCodeTab === "tracer" && (
                <pre>
{`import asi_telemetry

# 1. Initialize with your account API key
asi_telemetry.init(api_key="asi_live_4f89d3a1c028e...")

# 2. Decorate any agent execution, prompt chain, or tool
@asi_telemetry.traceable(name="research_agent", run_type="agent")
def run_autonomous_agent(user_prompt: str):
    # LLM execution is recorded with tokens, cost, and latency
    response = call_gemini(user_prompt)
    return response`}
                </pre>
              )}

              {activeCodeTab === "metrics" && (
                <pre>
{`from asi_telemetry import MetricsTracker

# Scoped to your agent identity & account API Key
tracker = MetricsTracker(
    agent_name="market-analyzer",
    api_key="asi_live_4f89d3a1c028e..."
)

@tracker.track("fetch_crypto_rates")
async def fetch_crypto_rates(symbol: str):
    # Tracks runtime duration, status, memory & percentiles
    data = await http_client.get(f"/rates/{symbol}")
    return data`}
                </pre>
              )}

              {activeCodeTab === "init" && (
                <pre>
{`# Or configure via environment variables (Zero Code Changes)
export ASI_API_KEY="asi_live_4f89d3a1c028e..."
export TELEMETRY_BACKEND_URL="http://localhost:8080"

# Now any imported tracker automatically dispatches
# to your authenticated account partition.`}
                </pre>
              )}
            </div>

            {/* Footer with copy button */}
            <div className="border-t border-border bg-muted/20 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Cookies & Bearer Tokens verified on all ingestion calls</span>
              </span>
              <button
                type="button"
                onClick={handleCopyKeySnippet}
                className="hover:text-foreground flex items-center gap-1 text-xs cursor-pointer font-medium"
              >
                {copiedKeySnippet ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Real-time Live Trace Preview Mock */}
          <div className="lg:col-span-5 rounded-xl border border-border bg-card p-5 shadow-md flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground border border-border">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Live Collective Trace Graph
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    trace_90d2e81 • 3 spans
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                200 OK
              </span>
            </div>

            {/* Simulated Tree Spans */}
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-md border border-border bg-muted/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    research_agent (Root)
                  </span>
                  <span className="text-[10px] text-muted-foreground">342 ms</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-sans truncate">
                  Prompt: &quot;Analyze Solana gas spikes&quot;
                </div>
              </div>

              <div className="ml-4 pl-3 border-l-2 border-border/80 space-y-2">
                <div className="p-2 rounded-md border border-border bg-card flex items-center justify-between">
                  <span className="text-xs text-foreground flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-muted-foreground" />
                    gemini-2.5-flash
                  </span>
                  <span className="text-[10px] text-muted-foreground">185 ms • 412 tok</span>
                </div>
                <div className="p-2 rounded-md border border-border bg-card flex items-center justify-between">
                  <span className="text-xs text-foreground flex items-center gap-1">
                    <Code2 className="h-3 w-3 text-muted-foreground" />
                    fetch_crypto_rates (Tool)
                  </span>
                  <span className="text-[10px] text-muted-foreground">112 ms • success</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Owner: alex@devrithm.io</span>
              <Link
                href="/llm-traces"
                className="text-foreground font-medium hover:underline flex items-center gap-1"
              >
                <span>View in Trace Explorer</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ────────────────────────────────────────────────────── */}
      <section id="features" className="py-16 border-t border-border bg-card/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Engineered Specifically for AI Agent Fleets
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Traditional APM tools fall apart on recursive agent calls, tool invocations,
              and non-deterministic LLM graphs. ASI:Telemetry was built from the ground up for agent swarms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="p-5 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all shadow-xs space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Bot className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Distributed Swarm Tracing
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect parent agent reasoning chains to child delegate tools,
                preserving complete correlation context across decentralized networks.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all shadow-xs space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                ClickHouse Columnar Storage
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Lightning-fast aggregation queries on millions of metrics with zero lag.
                Quantile percentiles (p50, p90, p95, p99) computed in milliseconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all shadow-xs space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <KeyRound className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Scoped API Keys & Cookie Auth
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tokens and sessions are securely stored exclusively in HTTP cookies.
                Generate environment-isolated keys (`asi_live_...`, `asi_stage_...`) with instant revocation.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all shadow-xs space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Gauge className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Token & Cost Accounting
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatic calculation of prompt vs. completion tokens and dollar costs
                for Gemini, OpenAI, Anthropic, and custom fine-tuned weights.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all shadow-xs space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Boxes className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Fleet Discovery & Identity
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatically discover registered agents, uAgent cryptographic wallet addresses,
                and application function signatures without manual configuration.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all shadow-xs space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Non-Blocking Dispatcher
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Daemonized background threads ship telemetry payloads asynchronously.
                Your LLM agents never slow down or wait on monitoring network packets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture Pipeline ────────────────────────────────────────────── */}
      <section id="architecture" className="py-16 max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-md space-y-6">
          <div className="text-center space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              High-Velocity Telemetry Pipeline
            </h3>
            <p className="text-xs text-muted-foreground">
              From your agent code to ClickHouse analytics in under 5 milliseconds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 text-center sm:text-left">
              <div className="text-xs font-mono text-muted-foreground">Step 01</div>
              <div className="font-semibold text-xs text-foreground">SDK Ingestion</div>
              <p className="text-[11px] text-muted-foreground">
                `asi_telemetry` hooks into agent functions, attaching API key headers and trace IDs.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 text-center sm:text-left">
              <div className="text-xs font-mono text-muted-foreground">Step 02</div>
              <div className="font-semibold text-xs text-foreground">FastAPI Edge Gateway</div>
              <p className="text-[11px] text-muted-foreground">
                Resolves API key to user account with in-memory TTL cache and validates OpenTelemetry spans.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 text-center sm:text-left">
              <div className="text-xs font-mono text-muted-foreground">Step 03</div>
              <div className="font-semibold text-xs text-foreground">ClickHouse & Live UI</div>
              <p className="text-[11px] text-muted-foreground">
                Stores records partitioned by `user_id`. Instant dashboard aggregation with cookie auth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom Call To Action ───────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-card/40 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Start observing your autonomous agents today.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
            Create an account in 30 seconds. Generate an API key and begin streaming
            real-time telemetry directly to your workspace.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:bg-primary/90 transition-all active:scale-98"
            >
              <span>Create Free Account</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-lg border border-border bg-card hover:bg-muted font-medium text-xs text-foreground transition-all"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background py-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ClickHouse Telemetry Ingestion Cluster: Operational</span>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/api-keys" className="hover:text-foreground transition-colors">
              API Keys
            </Link>
            <Link href="/llm-traces" className="hover:text-foreground transition-colors">
              LLM Traces
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} ASI:Telemetry. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

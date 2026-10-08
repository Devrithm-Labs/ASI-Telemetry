"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Terminal,
  Code2,
  Sparkles,
  Zap,
  ShieldCheck,
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowRight,
  Boxes,
  KeyRound,
  FileCode2,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";
import { TraceRecord } from "../dashboard-types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface HomeSectionProps {
  onNavigateToTracing: () => void;
  onNavigateToMonitoring: () => void;
  onSendTestTrace: (trace: TraceRecord) => void;
}

export function HomeSection({
  onNavigateToTracing,
  onNavigateToMonitoring,
  onSendTestTrace,
}: HomeSectionProps) {
  // Package manager selection
  const [pkgManager, setPkgManager] = React.useState<"pip" | "poetry" | "npm" | "pnpm">("pip");
  
  // Framework code sample tab
  const [activeCodeTab, setActiveCodeTab] = React.useState<
    "langsmith" | "langfuse" | "native" | "langchain" | "typescript"
  >("langsmith");

  // Environment tab
  const [envTab, setEnvTab] = React.useState<"langsmith" | "langfuse" | "asi">("langsmith");

  // Key visibility and copy feedback
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Test trace simulation state
  const [testTraceSent, setTestTraceSent] = React.useState(false);
  const [testTraceId, setTestTraceId] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);

  const apiKey = "asi_sk_live_9f81a7b48ce2e947";
  const maskedKey = "asi_sk_live_••••••••••••e947";
  const hostUrl = "https://telemetry.devrithm.io";
  const projectName = "devrithm-prod";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleSimulateTrace = () => {
    setIsSending(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now
        .getDate()
        .toString()
        .padStart(2, "0")} ${now
        .getHours()
        .toString()
        .padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      const generatedId = `trc-demo-${Math.random().toString(16).substring(2, 8)}`;
      const newTrace: TraceRecord = {
        id: generatedId,
        name: "sdk.quickstart.hello_world",
        service: "asi-quickstart-test",
        status: "success",
        statusCode: 200,
        latencyMs: 138,
        cpuPercent: 24,
        tokens: 384,
        model: "gpt-4o",
        timestamp: timeStr,
        spans: [
          { name: "sdk.init_connection", durationMs: 14, status: "ok" },
          { name: "llm.stream_generation", durationMs: 110, status: "ok" },
          { name: "telemetry.otlp_flush", durationMs: 14, status: "ok" },
        ],
      };

      onSendTestTrace(newTrace);
      setTestTraceId(generatedId);
      setTestTraceSent(true);
      setIsSending(false);
    }, 600);
  };

  // Install command snippets
  const installCommands: Record<string, string> = {
    pip: "pip install asi-telemetry langsmith langfuse openai",
    poetry: "poetry add asi-telemetry langsmith langfuse openai",
    npm: "npm install @asi/telemetry langsmith langfuse openai",
    pnpm: "pnpm add @asi/telemetry langsmith langfuse openai",
  };

  // Environment snippets
  const envSnippets = {
    langsmith: `# LangSmith Drop-in Compatibility for ASI-Telemetry
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT="${hostUrl}/api/v1/langsmith"
LANGSMITH_API_KEY="${apiKey}"
LANGSMITH_PROJECT="${projectName}"
OPENAI_API_KEY="your-openai-api-key"`,
    langfuse: `# Langfuse Drop-in Compatibility for ASI-Telemetry
LANGFUSE_PUBLIC_KEY="asi_pk_live_4492a"
LANGFUSE_SECRET_KEY="${apiKey}"
LANGFUSE_BASE_URL="${hostUrl}"
OPENAI_API_KEY="your-openai-api-key"`,
    asi: `# ASI-Telemetry Native SDK
ASI_API_KEY="${apiKey}"
ASI_HOST="${hostUrl}"
ASI_PROJECT="${projectName}"
ASI_ENVIRONMENT="production"
OPENAI_API_KEY="your-openai-api-key"`,
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="rounded-xl border border-[#1e293b] bg-black p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/60 bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-300">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>ASI-Telemetry SDK Onboarding & Quickstart</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Connect Your LLM Application & Agents
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Drop-in OpenTelemetry instrumentation compatible with{" "}
              <span className="text-blue-300 font-semibold">LangSmith</span>,{" "}
              <span className="text-blue-300 font-semibold">Langfuse</span>, and native Python/TypeScript SDKs.
              Track latency, token economics, tool calls, and error budgets in real time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 shrink-0">
            <Button
              onClick={onNavigateToMonitoring}
              variant="outline"
              className="border-[#1e293b] bg-black text-slate-300 hover:bg-[#111111] hover:text-white hover:border-blue-500/60 text-xs font-semibold"
            >
              <Cpu className="h-4 w-4 mr-1.5 text-blue-400" />
              View Tool Monitoring
            </Button>
            <Button
              onClick={onNavigateToTracing}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
            >
              <Activity className="h-4 w-4 mr-1.5" />
              Live Traces Stream
            </Button>
          </div>
        </div>

        {/* Project API Credentials Banner */}
        <div className="mt-6 pt-5 border-t border-[#1e293b] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-[#1e293b] bg-[#080808] p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-mono tracking-wider">Project ID</div>
              <div className="font-semibold text-slate-200 mt-0.5 font-mono">{projectName}</div>
            </div>
            <button
              onClick={() => handleCopy(projectName, "project")}
              className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
              title="Copy Project ID"
            >
              {copiedKey === "project" ? (
                <Check className="h-4 w-4 text-blue-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="rounded-lg border border-[#1e293b] bg-[#080808] p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-mono tracking-wider">API Ingestion Key</div>
              <div className="font-semibold text-slate-200 mt-0.5 font-mono">
                {showApiKey ? apiKey : maskedKey}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                title={showApiKey ? "Hide Key" : "Show Key"}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleCopy(apiKey, "apikey")}
                className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                title="Copy API Key"
              >
                {copiedKey === "apikey" ? (
                  <Check className="h-4 w-4 text-blue-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#1e293b] bg-[#080808] p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-mono tracking-wider">OTLP Endpoint</div>
              <div className="font-semibold text-blue-400 mt-0.5 font-mono truncate max-w-[190px]">
                {hostUrl}
              </div>
            </div>
            <button
              onClick={() => handleCopy(hostUrl, "host")}
              className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
              title="Copy Ingestion Host"
            >
              {copiedKey === "host" ? (
                <Check className="h-4 w-4 text-blue-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step by Step Implementation Container */}
      <div className="space-y-6">
        {/* STEP 1: Installation */}
        <div className="rounded-xl border border-[#1e293b] bg-black p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install the SDK Packages</h3>
                <p className="text-xs text-slate-400">
                  Select your package manager to install ASI-Telemetry and compatibility wrappers.
                </p>
              </div>
            </div>

            {/* Package Manager Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-[#1e293b] bg-[#0a0a0a] p-1">
              {(["pip", "poetry", "npm", "pnpm"] as const).map((pm) => (
                <button
                  key={pm}
                  onClick={() => setPkgManager(pm)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    pkgManager === pm
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 relative rounded-lg border border-[#1e293b] bg-[#050505] p-3 font-mono text-xs text-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-blue-400 select-none">$</span>
              <span className="text-slate-100">{installCommands[pkgManager]}</span>
            </div>
            <button
              onClick={() => handleCopy(installCommands[pkgManager]!, "install")}
              className="ml-4 flex items-center gap-1.5 rounded-md border border-[#1e293b] bg-[#111111] px-2.5 py-1 text-[11px] text-slate-300 hover:bg-[#1a1a1a] hover:text-white transition-colors shrink-0"
            >
              {copiedKey === "install" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-blue-300 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* STEP 2: Configure Environment Variables */}
        <div className="rounded-xl border border-[#1e293b] bg-black p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20">
                2
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Configure Environment Variables</h3>
                <p className="text-xs text-slate-400">
                  Add the connection credentials to your project's <span className="font-mono text-slate-300">.env</span> file.
                </p>
              </div>
            </div>

            {/* Framework Env Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-[#1e293b] bg-[#0a0a0a] p-1">
              <button
                onClick={() => setEnvTab("langsmith")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  envTab === "langsmith"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                LangSmith Style
              </button>
              <button
                onClick={() => setEnvTab("langfuse")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  envTab === "langfuse"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Langfuse Style
              </button>
              <button
                onClick={() => setEnvTab("asi")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  envTab === "asi"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ASI Native
              </button>
            </div>
          </div>

          <div className="mt-4 relative rounded-lg border border-[#1e293b] bg-[#050505] p-4 font-mono text-xs">
            <div className="absolute right-3 top-3">
              <button
                onClick={() => handleCopy(envSnippets[envTab], "env")}
                className="flex items-center gap-1.5 rounded-md border border-[#1e293b] bg-[#111111] px-2.5 py-1 text-[11px] text-slate-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
              >
                {copiedKey === "env" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-blue-300 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy .env</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-slate-300 whitespace-pre overflow-x-auto leading-relaxed">
              {envSnippets[envTab]}
            </pre>
          </div>
        </div>

        {/* STEP 3: Instrumentation Code Examples */}
        <div className="rounded-xl border border-[#1e293b] bg-black p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20">
                3
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instrument Your LLM or Agent Code</h3>
                <p className="text-xs text-slate-400">
                  Select your framework below to view copy-paste integration snippets.
                </p>
              </div>
            </div>

            {/* Framework Selector Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[#1e293b] bg-[#0a0a0a] p-1">
              <button
                onClick={() => setActiveCodeTab("langsmith")}
                className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCodeTab === "langsmith"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                LangSmith (@traceable)
              </button>
              <button
                onClick={() => setActiveCodeTab("langfuse")}
                className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCodeTab === "langfuse"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Langfuse (@observe)
              </button>
              <button
                onClick={() => setActiveCodeTab("native")}
                className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCodeTab === "native"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ASI Native Tracer
              </button>
              <button
                onClick={() => setActiveCodeTab("langchain")}
                className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCodeTab === "langchain"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                LangChain / LangGraph
              </button>
              <button
                onClick={() => setActiveCodeTab("typescript")}
                className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCodeTab === "typescript"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                TypeScript / Next.js
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="rounded-lg border border-[#1e293b] bg-[#050505] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0c0c0c] px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-blue-400" />
                <span className="font-semibold text-slate-200">
                  {activeCodeTab === "langsmith" && "agent_pipeline_langsmith.py"}
                  {activeCodeTab === "langfuse" && "agent_pipeline_langfuse.py"}
                  {activeCodeTab === "native" && "agent_pipeline_asi_native.py"}
                  {activeCodeTab === "langchain" && "langchain_langgraph_agent.py"}
                  {activeCodeTab === "typescript" && "agent-runtime.ts"}
                </span>
                <span className="rounded bg-blue-950/80 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-800/50">
                  {activeCodeTab === "typescript" ? "TypeScript" : "Python 3.10+"}
                </span>
              </div>

              <button
                onClick={() => {
                  let codeToCopy = "";
                  if (activeCodeTab === "langsmith") codeToCopy = langsmithCode;
                  else if (activeCodeTab === "langfuse") codeToCopy = langfuseCode;
                  else if (activeCodeTab === "native") codeToCopy = asiNativeCode;
                  else if (activeCodeTab === "langchain") codeToCopy = langchainCode;
                  else if (activeCodeTab === "typescript") codeToCopy = typescriptCode;
                  handleCopy(codeToCopy, "activeCode");
                }}
                className="flex items-center gap-1.5 rounded-md border border-[#1e293b] bg-[#141414] px-2.5 py-1 text-[11px] text-slate-300 hover:bg-[#1f1f1f] hover:text-white transition-colors"
              >
                {copiedKey === "activeCode" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-blue-300 font-semibold">Copied Code</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 font-mono text-xs overflow-x-auto leading-relaxed">
              {activeCodeTab === "langsmith" && (
                <pre className="text-slate-200">
                  <span className="text-slate-500"># 1. Import LangSmith traceable decorator and OpenAI client</span>{"\n"}
                  <span className="text-blue-400">from</span> langsmith <span className="text-blue-400">import</span> traceable{"\n"}
                  <span className="text-blue-400">from</span> openai <span className="text-blue-400">import</span> OpenAI{"\n"}
                  {"\n"}
                  client = OpenAI(){"\n"}
                  {"\n"}
                  <span className="text-slate-500"># 2. Decorate child tool functions</span>{"\n"}
                  <span className="text-blue-400">@traceable</span>(run_type=<span className="text-sky-300">"tool"</span>, name=<span className="text-sky-300">"vector_search_tool"</span>){"\n"}
                  <span className="text-blue-400">def</span> <span className="text-blue-300">search_knowledge_base</span>(query: str):{"\n"}
                  {"    "}<span className="text-blue-400">return</span> [{"{"}<span className="text-sky-300">"doc"</span>: <span className="text-sky-300">"ASI-Telemetry provides microsecond latency spans."</span>{"}"}]{"\n"}
                  {"\n"}
                  <span className="text-slate-500"># 3. Decorate parent LLM agent or chain</span>{"\n"}
                  <span className="text-blue-400">@traceable</span>(run_type=<span className="text-sky-300">"chain"</span>, name=<span className="text-sky-300">"support_agent_workflow"</span>){"\n"}
                  <span className="text-blue-400">def</span> <span className="text-blue-300">run_support_agent</span>(user_prompt: str) -&gt; str:{"\n"}
                  {"    "}docs = search_knowledge_base(user_prompt){"\n"}
                  {"    "}response = client.chat.completions.create({"\n"}
                  {"        "}model=<span className="text-sky-300">"gpt-4o"</span>,{"\n"}
                  {"        "}messages=[{"\n"}
                  {"            "}{"{"}<span className="text-sky-300">"role"</span>: <span className="text-sky-300">"system"</span>, <span className="text-sky-300">"content"</span>: f<span className="text-sky-300">"Context: &#123;docs&#125;"</span>{"}"},{"\n"}
                  {"            "}{"{"}<span className="text-sky-300">"role"</span>: <span className="text-sky-300">"user"</span>, <span className="text-sky-300">"content"</span>: user_prompt{"}"},{"\n"}
                  {"        "}],{"\n"}
                  {"    "}){"\n"}
                  {"    "}<span className="text-blue-400">return</span> response.choices[0].message.content{"\n"}
                  {"\n"}
                  <span className="text-slate-500"># 4. Run your application — traces automatically stream to ASI-Telemetry</span>{"\n"}
                  output = run_support_agent(<span className="text-sky-300">"How do I install ASI-Telemetry SDK?"</span>){"\n"}
                  <span className="text-blue-400">print</span>(output)
                </pre>
              )}

              {activeCodeTab === "langfuse" && (
                <pre className="text-slate-200">
                  <span className="text-slate-500"># 1. Import Langfuse observe decorator and drop-in wrapped OpenAI client</span>{"\n"}
                  <span className="text-blue-400">from</span> langfuse.decorators <span className="text-blue-400">import</span> observe{"\n"}
                  <span className="text-blue-400">from</span> langfuse.openai <span className="text-blue-400">import</span> openai <span className="text-slate-500"># Automatically captures token economics & cost</span>{"\n"}
                  {"\n"}
                  <span className="text-slate-500"># 2. Trace step functions with nested spans</span>{"\n"}
                  <span className="text-blue-400">@observe</span>(){"\n"}
                  <span className="text-blue-400">def</span> <span className="text-blue-300">retrieve_documents</span>(query: str):{"\n"}
                  {"    "}<span className="text-blue-400">return</span> <span className="text-sky-300">"Relevant chunk: ASI-Telemetry supports high-throughput ingestion."</span>{"\n"}
                  {"\n"}
                  <span className="text-slate-500"># 3. Trace main generation entrypoint</span>{"\n"}
                  <span className="text-blue-400">@observe</span>(){"\n"}
                  <span className="text-blue-400">def</span> <span className="text-blue-300">generate_summary</span>(text: str) -&gt; str:{"\n"}
                  {"    "}ctx = retrieve_documents(text){"\n"}
                  {"    "}completion = openai.chat.completions.create({"\n"}
                  {"        "}model=<span className="text-sky-300">"claude-3-5-sonnet-20241022"</span>,{"\n"}
                  {"        "}messages=[{"{"}<span className="text-sky-300">"role"</span>: <span className="text-sky-300">"user"</span>, <span className="text-sky-300">"content"</span>: f<span className="text-sky-300">"Summarize: &#123;ctx&#125; - &#123;text&#125;"</span>{"}"}],{"\n"}
                  {"        "}temperature=0.2,{"\n"}
                  {"    "}){"\n"}
                  {"    "}<span className="text-blue-400">return</span> completion.choices[0].message.content{"\n"}
                  {"\n"}
                  <span className="text-slate-500"># 4. Traces are automatically flushed asynchronously in the background</span>{"\n"}
                  res = generate_summary(<span className="text-sky-300">"Agent Observability architecture"</span>){"\n"}
                  <span className="text-blue-400">print</span>(res)
                </pre>
              )}

              {activeCodeTab === "native" && (
                <pre className="text-slate-200">
                  <span className="text-slate-500"># High-throughput OpenTelemetry native tracer with zero performance overhead</span>{"\n"}
                  <span className="text-blue-400">from</span> asi_telemetry <span className="text-blue-400">import</span> ASITracer, SpanKind{"\n"}
                  {"\n"}
                  tracer = ASITracer({"\n"}
                  {"    "}project_id=<span className="text-sky-300">"devrithm-prod"</span>,{"\n"}
                  {"    "}api_key=<span className="text-sky-300">"asi_sk_live_9f81a7b48ce2e947"</span>,{"\n"}
                  {"    "}endpoint=<span className="text-sky-300">"https://telemetry.devrithm.io/v1"</span>{"\n"}
                  ){"\n"}
                  {"\n"}
                  <span className="text-slate-500"># Context manager for parent execution trace</span>{"\n"}
                  <span className="text-blue-400">with</span> tracer.start_trace(name=<span className="text-sky-300">"autonomous_planning_loop"</span>) <span className="text-blue-400">as</span> trace:{"\n"}
                  {"    "}trace.set_tag(<span className="text-sky-300">"agent.version"</span>, <span className="text-sky-300">"v2.4.0"</span>){"\n"}
                  {"    "}trace.set_tag(<span className="text-sky-300">"user.id"</span>, <span className="text-sky-300">"usr_98124"</span>){"\n"}
                  {"    "}{"\n"}
                  {"    "}<span className="text-slate-500"># Child span for tool execution</span>{"\n"}
                  {"    "}<span className="text-blue-400">with</span> trace.span(name=<span className="text-sky-300">"rag.embedding_lookup"</span>, kind=SpanKind.INTERNAL) <span className="text-blue-400">as</span> span:{"\n"}
                  {"        "}span.record_metric(<span className="text-sky-300">"top_k"</span>, 10){"\n"}
                  {"        "}span.record_metric(<span className="text-sky-300">"latency_ms"</span>, 38){"\n"}
                  {"        "}span.set_status(<span className="text-sky-300">"OK"</span>){"\n"}
                  {"    "}{"\n"}
                  {"    "}<span className="text-slate-500"># Record model token economics</span>{"\n"}
                  {"    "}trace.record_llm_call({"\n"}
                  {"        "}model=<span className="text-sky-300">"gpt-4o"</span>,{"\n"}
                  {"        "}prompt_tokens=450,{"\n"}
                  {"        "}completion_tokens=180,{"\n"}
                  {"        "}latency_ms=640,{"\n"}
                  {"    "})
                </pre>
              )}

              {activeCodeTab === "langchain" && (
                <pre className="text-slate-200">
                  <span className="text-slate-500"># Drop-in CallbackHandler for LangChain and LangGraph</span>{"\n"}
                  <span className="text-blue-400">from</span> langchain_openai <span className="text-blue-400">import</span> ChatOpenAI{"\n"}
                  <span className="text-blue-400">from</span> langchain_core.prompts <span className="text-blue-400">import</span> ChatPromptTemplate{"\n"}
                  <span className="text-blue-400">from</span> asi_telemetry.integrations.langchain <span className="text-blue-400">import</span> ASICallbackHandler{"\n"}
                  {"\n"}
                  <span className="text-slate-500"># 1. Initialize ASI Callback Handler</span>{"\n"}
                  asi_handler = ASICallbackHandler({"\n"}
                  {"    "}project_name=<span className="text-sky-300">"devrithm-prod"</span>,{"\n"}
                  {"    "}tags=[<span className="text-sky-300">"prod"</span>, <span className="text-sky-300">"financial-agent"</span>]{"\n"}
                  ){"\n"}
                  {"\n"}
                  <span className="text-slate-500"># 2. Attach handler to your LLM model or invocation run</span>{"\n"}
                  llm = ChatOpenAI(model=<span className="text-sky-300">"gpt-4o"</span>, callbacks=[asi_handler]){"\n"}
                  prompt = ChatPromptTemplate.from_template(<span className="text-sky-300">"Summarize the root cause of &#123;incident&#125;"</span>){"\n"}
                  chain = prompt | llm{"\n"}
                  {"\n"}
                  result = chain.invoke({"{"}<span className="text-sky-300">"incident"</span>: <span className="text-sky-300">"Postgres replica replication lag"</span>{"}"}){"\n"}
                  <span className="text-blue-400">print</span>(result.content)
                </pre>
              )}

              {activeCodeTab === "typescript" && (
                <pre className="text-slate-200">
                  <span className="text-slate-500">// TypeScript / Node.js & Next.js App Router support</span>{"\n"}
                  <span className="text-blue-400">import</span> {"{"} ASITelemetry {"}"} <span className="text-blue-400">from</span> <span className="text-sky-300">"@asi/telemetry"</span>;{"\n"}
                  <span className="text-blue-400">import</span> OpenAI <span className="text-blue-400">from</span> <span className="text-sky-300">"openai"</span>;{"\n"}
                  {"\n"}
                  <span className="text-blue-400">const</span> asi = <span className="text-blue-400">new</span> ASITelemetry({"{"}{"\n"}
                  {"  "}apiKey: process.env.ASI_API_KEY!,{"\n"}
                  {"  "}project: <span className="text-sky-300">"devrithm-prod"</span>,{"\n"}
                  {"}"});{"\n"}
                  {"\n"}
                  <span className="text-slate-500">// Wrap standard OpenAI client for automatic span generation</span>{"\n"}
                  <span className="text-blue-400">const</span> openai = asi.wrapOpenAI(<span className="text-blue-400">new</span> OpenAI());{"\n"}
                  {"\n"}
                  <span className="text-blue-400">export async function</span> <span className="text-blue-300">generateAgentResponse</span>(query: string) {"{"}{"\n"}
                  {"  "}<span className="text-blue-400">return await</span> asi.trace(<span className="text-sky-300">"agent_chat_stream"</span>, <span className="text-blue-400">async</span> (span) =&gt; {"{"}{"\n"}
                  {"    "}span.setTag(<span className="text-sky-300">"user_id"</span>, <span className="text-sky-300">"usr_4819"</span>);{"\n"}
                  {"    "}<span className="text-blue-400">const</span> res = <span className="text-blue-400">await</span> openai.chat.completions.create({"{"}{"\n"}
                  {"      "}model: <span className="text-sky-300">"gpt-4o"</span>,{"\n"}
                  {"      "}messages: [{"{"} role: <span className="text-sky-300">"user"</span>, content: query {"}"}],{"\n"}
                  {"    "}{"}"});{"\n"}
                  {"    "}<span className="text-blue-400">return</span> res.choices[0].message.content;{"\n"}
                  {"  "}{"}"});{"\n"}
                  {"}"}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* STEP 4: Live Verification & Connection Test */}
        <div className="rounded-xl border border-[#1e293b] bg-black p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20">
                4
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Test Your Ingestion & Verify Live Stream</h3>
                <p className="text-xs text-slate-400">
                  Send a live test trace from your browser to confirm real-time ingestion connectivity.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSimulateTrace}
              disabled={isSending}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Radio className="h-3.5 w-3.5 animate-spin" />
                  <span>Emitting Test Trace...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Test Trace Ping</span>
                </>
              )}
            </Button>
          </div>

          {testTraceSent && (
            <div className="mt-4 rounded-lg border border-blue-900/60 bg-blue-950/20 p-4 transition-all animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Trace Acknowledged (200 OK)</span>
                      <span className="rounded bg-blue-900/60 px-2 py-0.5 text-[10px] font-mono text-blue-300">
                        {testTraceId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Ingested in 18ms via OTLP/HTTP. Parsed model: <span className="text-slate-200 font-mono">gpt-4o</span>, Latency: <span className="text-blue-300 font-mono">138ms</span>.
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onNavigateToTracing}
                  variant="outline"
                  className="border-blue-600/60 bg-blue-950/40 text-blue-200 hover:bg-blue-600 hover:text-white text-xs font-semibold shrink-0"
                >
                  Inspect in Tracing Tab
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature & Value Highlights (LangSmith / Langfuse Comparison) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-[#1e293b] bg-black p-4 space-y-2 hover:border-blue-500/50 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
            <Zap className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-100">Zero Ingestion Latency</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Asynchronous background buffer batches spans over HTTP/2 and gRPC without slowing down your agent responses.
          </p>
        </Card>

        <Card className="border border-[#1e293b] bg-black p-4 space-y-2 hover:border-blue-500/50 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
            <Layers className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-100">Full Execution Waterfalls</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Deep hierarchy of tool invocations, RAG retrievals, prompt payloads, and model responses with microsecond precision.
          </p>
        </Card>

        <Card className="border border-[#1e293b] bg-black p-4 space-y-2 hover:border-blue-500/50 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
            <Boxes className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-100">Drop-in SDK Compatibility</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Run your existing LangSmith or Langfuse code without refactoring. Just update environment variables.
          </p>
        </Card>

        <Card className="border border-[#1e293b] bg-black p-4 space-y-2 hover:border-blue-500/50 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-100">Token & Cost Attribution</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time token cost modeling across OpenAI, Anthropic, Gemini, Mistral, and self-hosted vLLM instances.
          </p>
        </Card>
      </div>
    </div>
  );
}

const langsmithCode = `# 1. Import LangSmith traceable decorator and OpenAI client
from langsmith import traceable
from openai import OpenAI

client = OpenAI()

# 2. Decorate child tool functions
@traceable(run_type="tool", name="vector_search_tool")
def search_knowledge_base(query: str):
    return [{"doc": "ASI-Telemetry provides microsecond latency spans."}]

# 3. Decorate parent LLM agent or chain
@traceable(run_type="chain", name="support_agent_workflow")
def run_support_agent(user_prompt: str) -> str:
    docs = search_knowledge_base(user_prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Context: {docs}"},
            {"role": "user", "content": user_prompt},
        ],
    )
    return response.choices[0].message.content

# 4. Run your application — traces automatically stream to ASI-Telemetry
output = run_support_agent("How do I install ASI-Telemetry SDK?")
print(output)`;

const langfuseCode = `# 1. Import Langfuse observe decorator and drop-in wrapped OpenAI client
from langfuse.decorators import observe
from langfuse.openai import openai # Automatically captures token economics & cost

# 2. Trace step functions with nested spans
@observe()
def retrieve_documents(query: str):
    return "Relevant chunk: ASI-Telemetry supports high-throughput ingestion."

# 3. Trace main generation entrypoint
@observe()
def generate_summary(text: str) -> str:
    ctx = retrieve_documents(text)
    completion = openai.chat.completions.create(
        model="claude-3-5-sonnet-20241022",
        messages=[{"role": "user", "content": f"Summarize: {ctx} - {text}"}],
        temperature=0.2,
    )
    return completion.choices[0].message.content

# 4. Traces are automatically flushed asynchronously in the background
res = generate_summary("Agent Observability architecture")
print(res)`;

const asiNativeCode = `# High-throughput OpenTelemetry native tracer with zero performance overhead
from asi_telemetry import ASITracer, SpanKind

tracer = ASITracer(
    project_id="devrithm-prod",
    api_key="asi_sk_live_9f81a7b48ce2e947",
    endpoint="https://telemetry.devrithm.io/v1"
)

# Context manager for parent execution trace
with tracer.start_trace(name="autonomous_planning_loop") as trace:
    trace.set_tag("agent.version", "v2.4.0")
    trace.set_tag("user.id", "usr_98124")
    
    # Child span for tool execution
    with trace.span(name="rag.embedding_lookup", kind=SpanKind.INTERNAL) as span:
        span.record_metric("top_k", 10)
        span.record_metric("latency_ms", 38)
        span.set_status("OK")
    
    # Record model token economics
    trace.record_llm_call(
        model="gpt-4o",
        prompt_tokens=450,
        completion_tokens=180,
        latency_ms=640,
    )`;

const langchainCode = `# Drop-in CallbackHandler for LangChain and LangGraph
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from asi_telemetry.integrations.langchain import ASICallbackHandler

# 1. Initialize ASI Callback Handler
asi_handler = ASICallbackHandler(
    project_name="devrithm-prod",
    tags=["prod", "financial-agent"]
)

# 2. Attach handler to your LLM model or invocation run
llm = ChatOpenAI(model="gpt-4o", callbacks=[asi_handler])
prompt = ChatPromptTemplate.from_template("Summarize the root cause of {incident}")
chain = prompt | llm

result = chain.invoke({"incident": "Postgres replica replication lag"})
print(result.content)`;

const typescriptCode = `// TypeScript / Node.js & Next.js App Router support
import { ASITelemetry } from "@asi/telemetry";
import OpenAI from "openai";

const asi = new ASITelemetry({
  apiKey: process.env.ASI_API_KEY!,
  project: "devrithm-prod",
});

// Wrap standard OpenAI client for automatic span generation
const openai = asi.wrapOpenAI(new OpenAI());

export async function generateAgentResponse(query: string) {
  return await asi.trace("agent_chat_stream", async (span) => {
    span.setTag("user_id", "usr_4819");
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: query }],
    });
    return res.choices[0].message.content;
  });
}`;

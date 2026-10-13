"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Copy, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock, dracula } from "react-code-blocks";

interface HomeSectionProps {
  apiKey?: string;
  projectName?: string;
}

export function HomeSection({
  apiKey: initialApiKey = "<your-asi-api-key>",
  projectName = "asi-production-fleet",
}: HomeSectionProps) {
  // Dependency manager tab: pip vs uv
  const [depManager, setDepManager] = React.useState<"pip" | "uv">("pip");

  // Environment format tab: Shell vs .env
  const [envFormat, setEnvFormat] = React.useState<"Shell" | ".env">("Shell");

  // Generated API key state
  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);

  // Copy feedback state
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const activeApiKey = generatedKey || initialApiKey;

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection(null);
    }, 1800);
  };

  const handleGenerateApiKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const newKey = `asi_sk_live_${randomHex}`;
    setGeneratedKey(newKey);
  };

  // Code snippets
  const installCode =
    depManager === "pip"
      ? "pip install -U asi-telemetry"
      : "uv add asi-telemetry";

  const envCodeShell = `export ASI_TELEMETRY_ENDPOINT=http://localhost:8080
export ASI_API_KEY=${activeApiKey}
export ASI_PROJECT="${projectName}"

export OPENAI_API_KEY=<your-openai-api-key>`;

  const envCodeDotEnv = `ASI_TELEMETRY_ENDPOINT=http://localhost:8080
ASI_API_KEY=${activeApiKey}
ASI_PROJECT="${projectName}"

OPENAI_API_KEY=<your-openai-api-key>`;

  const envCode = envFormat === "Shell" ? envCodeShell : envCodeDotEnv;

  const quickstartCode = `from asi_tracer import traceable

@traceable(name="agent_decision_step")
def run_agent(task_prompt: str):
    """Autonomous agent step tracked live in ClickHouse telemetry."""
    # Your agent reasoning or LLM tool invocation here
    return {"status": "success", "result": f"Executed prompt: {task_prompt}"}

if __name__ == "__main__":
    result = run_agent("Discover cross-agent routing paths")
    print(result)`;

  const customBlockStyle = {
    backgroundColor: "transparent",
    padding: "0.875rem",
    fontSize: "0.8125rem",
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    lineHeight: "1.65",
  };

  return (
    <div className="max-w-4xl mx-auto py-5 text-slate-800 dark:text-slate-200">
      {/* Step 1: Select a language */}
      <div className="relative flex gap-4 pb-8 group">
        {/* Track Line & Step Badge */}
        <div className="relative flex flex-col items-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-500/70 bg-blue-50 dark:bg-[#070b16] text-xs font-bold text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/20 z-10 shrink-0">
            1
          </div>
          <div className="absolute top-7 bottom-0 w-[2px] bg-gradient-to-b from-blue-500/60 to-slate-200 dark:to-[#1e293b]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2 pt-0.5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Select a language
          </h3>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c1017] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white shadow-sm hover:border-blue-500/50 transition-colors">
              <Image
                src="/image.png"
                alt="Python"
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
              <span className="font-semibold text-blue-600 dark:text-blue-400">Python 3.10+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Install dependencies */}
      <div className="relative flex gap-4 pb-8 group">
        {/* Track Line & Step Badge */}
        <div className="relative flex flex-col items-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-500/70 bg-blue-50 dark:bg-[#070b16] text-xs font-bold text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/20 z-10 shrink-0">
            2
          </div>
          <div className="absolute top-7 bottom-0 w-[2px] bg-slate-200 dark:bg-[#1e293b]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2 pt-0.5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Install dependencies
          </h3>
          <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#060910] overflow-hidden shadow-sm hover:border-blue-500/50 transition-colors">
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e293b] px-3.5 py-2 bg-slate-50 dark:bg-[#090d16]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDepManager("pip")}
                  className={`text-xs font-medium transition-colors ${
                    depManager === "pip"
                      ? "text-blue-600 dark:text-white font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  pip
                </button>
                <button
                  onClick={() => setDepManager("uv")}
                  className={`text-xs font-medium transition-colors ${
                    depManager === "uv"
                      ? "text-blue-600 dark:text-white font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  uv
                </button>
              </div>

              <button
                onClick={() => handleCopy(installCode, "install")}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors rounded hover:bg-slate-100 dark:hover:bg-[#141414]"
                title="Copy snippet"
              >
                {copiedSection === "install" ? (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Syntax Highlighted Code */}
            <div className="overflow-x-auto bg-[#0a0a0a]">
              <CodeBlock
                text={installCode}
                language="bash"
                showLineNumbers={false}
                theme={dracula}
                customStyle={customBlockStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Configure environment */}
      <div className="relative flex gap-4 pb-8 group">
        {/* Track Line & Step Badge */}
        <div className="relative flex flex-col items-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-500/70 bg-blue-50 dark:bg-[#070b16] text-xs font-bold text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/20 z-10 shrink-0">
            3
          </div>
          <div className="absolute top-7 bottom-0 w-[2px] bg-slate-200 dark:bg-[#1e293b]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2 pt-0.5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Configure telemetry environment
            </h3>
            <Button
              onClick={handleGenerateApiKey}
              className="rounded-md bg-blue-600 px-3.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 shadow-sm shadow-blue-600/30 transition-all h-7 flex items-center gap-1.5"
            >
              <Key className="h-3.5 w-3.5" />
              Generate API Key
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#060910] overflow-hidden shadow-sm hover:border-blue-500/50 transition-colors">
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e293b] px-3.5 py-2 bg-slate-50 dark:bg-[#090d16]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEnvFormat("Shell")}
                  className={`text-xs font-medium transition-colors ${
                    envFormat === "Shell"
                      ? "text-blue-600 dark:text-white font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Shell
                </button>
                <button
                  onClick={() => setEnvFormat(".env")}
                  className={`text-xs font-medium transition-colors ${
                    envFormat === ".env"
                      ? "text-blue-600 dark:text-white font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  .env
                </button>
              </div>

              <button
                onClick={() => handleCopy(envCode, "env")}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors rounded hover:bg-slate-100 dark:hover:bg-[#141414]"
                title="Copy snippet"
              >
                {copiedSection === "env" ? (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Syntax Highlighted Code */}
            <div className="overflow-x-auto bg-[#0a0a0a]">
              <CodeBlock
                text={envCode}
                language="bash"
                showLineNumbers={false}
                theme={dracula}
                customStyle={customBlockStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Run the quickstart */}
      <div className="relative flex gap-4 group">
        {/* Step Badge */}
        <div className="relative flex flex-col items-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-500/70 bg-blue-50 dark:bg-[#070b16] text-xs font-bold text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/20 z-10 shrink-0">
            4
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2 pt-0.5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Run the quickstart
          </h3>
          <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#060910] overflow-hidden shadow-sm hover:border-blue-500/50 transition-colors">
            {/* Header Bar */}
            <div className="flex items-center justify-end border-b border-slate-200 dark:border-[#1e293b] px-3.5 py-2 bg-slate-50 dark:bg-[#090d16]">
              <button
                onClick={() => handleCopy(quickstartCode, "quickstart")}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors rounded hover:bg-slate-100 dark:hover:bg-[#141414]"
                title="Copy snippet"
              >
                {copiedSection === "quickstart" ? (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Syntax Highlighted Code */}
            <div className="overflow-x-auto bg-[#0a0a0a]">
              <CodeBlock
                text={quickstartCode}
                language="python"
                showLineNumbers={false}
                theme={dracula}
                customStyle={customBlockStyle}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

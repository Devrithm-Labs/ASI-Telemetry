"use client";

import * as React from "react";
import {
  Bot,
  Check,
  Clock,
  Copy,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAgentLinkToken, AgentLinkTokenData } from "@/lib/agent-link";

interface ConnectAgentModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectAgentModal({ open, onClose }: ConnectAgentModalProps) {
  const [tokenData, setTokenData] = React.useState<AgentLinkTokenData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(300);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedCommand, setCopiedCommand] = React.useState(false);

  const fetchToken = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await generateAgentLinkToken();
      if (data) {
        setTokenData(data);
        setTimeLeft(data.expires_in_seconds || 300);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      fetchToken();
    } else {
      setTokenData(null);
    }
  }, [open, fetchToken]);

  // Countdown timer
  React.useEffect(() => {
    if (!open || !tokenData || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [open, tokenData, timeLeft]);

  if (!open) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const commandText = tokenData ? `link ${tokenData.token}` : "";

  const handleCopyCode = () => {
    if (!tokenData) return;
    navigator.clipboard.writeText(tokenData.token);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyCommand = () => {
    if (!commandText) return;
    navigator.clipboard.writeText(commandText);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card/95 shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                Connect ASI:One Agent
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Secure Pairing
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                One-time temporary pairing code (no permanent API keys in chat).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Security Alert Badge */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Zero Credential Exposure</p>
            <p className="text-muted-foreground mt-0.5">
              This single-use code expires in 5 minutes and is burned immediately upon linking. Your permanent API keys never touch chat logs.
            </p>
          </div>
        </div>

        {/* Code Display Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pairing Code
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={timeLeft < 60 ? "text-rose-500 font-bold" : "text-muted-foreground"}>
                {formattedTime}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4 font-mono">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Generating secret pairing token...</span>
              </div>
            ) : tokenData && timeLeft > 0 ? (
              <>
                <span className="text-2xl font-bold tracking-widest text-foreground">
                  {tokenData.token}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="gap-1.5 text-xs font-sans h-8"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-rose-500 font-sans font-medium">Code Expired</span>
                <Button size="sm" onClick={fetchToken} className="gap-1.5 text-xs font-sans">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Generate New</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 text-xs">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>How to Link in ASI:One Chat:</span>
          </p>

          <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-1">
            <li>
              Open your chat with the <strong className="text-foreground">ASI-Telemetry Agent</strong>.
            </li>
            <li>
              Send the following message:
              <div className="mt-1.5 flex items-center justify-between rounded-lg border border-border bg-muted/60 px-3 py-2 font-mono text-foreground text-xs">
                <span>{commandText || "link ASI-PAIR-XXXXXX"}</span>
                <button
                  onClick={handleCopyCommand}
                  disabled={!tokenData || timeLeft <= 0}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Copy command"
                >
                  {copiedCommand ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </li>
            <li>
              The agent verifies the code with your backend and links your account securely!
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchToken}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Regenerate Code</span>
          </Button>

          <Button size="sm" onClick={onClose} variant="secondary">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

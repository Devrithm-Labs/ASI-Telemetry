"use client";

import * as React from "react";
import {
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  connectGitHubIntegration,
  disconnectGitHubIntegration,
  fetchGitHubIntegration,
  GitHubIntegration,
} from "@/lib/integrations";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function GitHubRepoCard() {
  const [data, setData] = React.useState<GitHubIntegration | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form states
  const [repoInput, setRepoInput] = React.useState("");
  const [tokenInput, setTokenInput] = React.useState("");
  const [usernameInput, setUsernameInput] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGitHubIntegration();
      setData(res);
      if (res.default_repository) {
        setRepoInput(res.default_repository);
      }
      if (res.github_username) {
        setUsernameInput(res.github_username);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!repoInput.trim()) {
      setError("Please specify a target repository (owner/repo).");
      return;
    }
    if (!tokenInput.trim() && !data?.connected) {
      setError("Please provide a GitHub personal access token with repo permissions.");
      return;
    }

    setSaving(true);
    try {
      const res = await connectGitHubIntegration({
        repository: repoInput.trim(),
        accessToken: tokenInput.trim(),
        username: usernameInput.trim() || undefined,
      });
      setData(res);
      setIsModalOpen(false);
      setTokenInput("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect repository");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this repository from ASI:Telemetry?")) {
      return;
    }
    setLoading(true);
    try {
      await disconnectGitHubIntegration();
      setData({ connected: false });
      setRepoInput("");
    } finally {
      setLoading(false);
    }
  };

  const isConnected = Boolean(data?.connected && data.default_repository);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 border border-border text-foreground shadow-xs shrink-0">
            <GitHubIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Connected GitHub Repository
              </h3>
              {loading ? (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  Not Linked
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Repository linked for automated AI self-healing and Pull Request pushes via ASI:One & GitHub MCP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs h-8 gap-1.5")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Switch Repo
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 gap-1.5"
                )}
                title="Disconnect repository"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={cn(buttonVariants({ size: "sm" }), "text-xs h-8 gap-1.5 font-semibold shadow-xs")}
            >
              <Plus className="h-3.5 w-3.5" />
              Connect Repository
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading repository details...
          </div>
        ) : isConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Repository Info Box */}
            <div className="md:col-span-2 rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-primary" />
                  Target Repository
                </span>
                <a
                  href={`https://github.com/${data?.default_repository}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-foreground bg-background px-3 py-1.5 rounded-lg border border-border shadow-2xs">
                  {data?.default_repository}
                </span>
                {data?.github_username && (
                  <span className="text-xs text-muted-foreground">
                    by <span className="font-medium text-foreground">@{data.github_username}</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>
                  MCP Guardrail Active: Isolated branch protection enforced. Direct writes to main branch are blocked.
                </span>
              </div>
            </div>

            {/* In-Chat ASI:One Command Guide */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                ASI:One Chat Control
              </span>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                When runtime errors occur in ASI:One, inspect with <code className="text-primary font-mono bg-muted px-1 py-0.5 rounded">diagnose</code> and push fixes to this repo with <code className="text-primary font-mono bg-muted px-1 py-0.5 rounded">approve pr</code>.
              </p>
              <div className="mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-mono">
                Command: select repo {data?.default_repository}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-6 px-4 bg-muted/10 rounded-xl border border-dashed border-border/80">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-3">
              <GitBranch className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No GitHub Repository Connected</h4>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
              Connect a GitHub repository to enable automatic error diagnosis, unified diff proposals, and 1-click Pull Request creation directly through ASI:One chat.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={cn(buttonVariants({ size: "sm" }), "text-xs font-semibold gap-1.5")}
            >
              <Plus className="h-3.5 w-3.5" />
              Connect Repository Now
            </button>
          </div>
        )}
      </div>

      {/* Modal Dialog for Connecting / Switching Repository */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <GitHubIcon className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {isConnected ? "Switch GitHub Repository" : "Connect GitHub Repository"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Target Repository <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="owner/repository-name (e.g. acme-org/telemetry-agent)"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Must follow standard <code className="font-mono">owner/repo</code> syntax.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span>GitHub Personal Access Token</span>
                  {isConnected && <span className="text-[10px] text-muted-foreground font-normal">(Leave blank to keep existing)</span>}
                </label>
                <input
                  type="password"
                  placeholder={isConnected ? "••••••••••••••••" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Requires <code className="font-mono text-primary">repo</code> or <code className="font-mono text-primary">contents:write</code> & <code className="font-mono text-primary">pull_requests:write</code> scopes.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  GitHub Username <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. octocat"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(buttonVariants({ size: "sm" }), "text-xs font-semibold gap-1.5")}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Save & Connect
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

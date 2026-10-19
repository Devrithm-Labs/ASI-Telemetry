"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { saveStoredUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("alex@devrithm.io");
  const [password, setPassword] = React.useState("••••••••••••");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = React.useState(false);
  const [forgotEmailSent, setForgotEmailSent] = React.useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      // Create session
      const nameFromEmail = email.split("@")[0] || "Telemetry User";
      const formattedName = nameFromEmail
        .split(".")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");

      saveStoredUser({
        id: `usr_${Date.now()}`,
        name: formattedName || "Alex Vance",
        email: email,
        company: "Devrithm Labs",
        role: "AI Lead Architect",
      });

      setIsLoading(false);
      router.push("/api-keys");
    }, 600);
  };

  const handleQuickDemoLogin = () => {
    setIsLoading(true);
    setErrorMsg(null);
    setTimeout(() => {
      saveStoredUser({
        id: "usr_demo_1",
        name: "Alex Vance",
        email: "alex@devrithm.io",
        company: "Devrithm Labs",
        role: "Lead Observability Engineer",
      });
      setIsLoading(false);
      router.push("/api-keys");
    }, 450);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 selection:bg-blue-600/30 selection:text-blue-600 transition-colors">
      {/* Background Decorative Glow Gradients */}
      <div className="absolute top-0 left-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none dark:bg-blue-600/15" />
      <div className="absolute bottom-10 right-1/4 -z-10 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none dark:bg-indigo-600/15" />

      {/* Top Navigation Bar */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 backdrop-blur-md bg-white/70 dark:bg-[#07090e]/70 z-20">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              ASI:Telemetry
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono -mt-0.5">
              AI Observability & Trace Pipeline
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Don&apos;t have an account?
          </span>
          <Link
            href="/signup"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            Sign Up
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Platform Showcase (Visible on Large screens) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-medium w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Telemetry SDK 2.0 & LLM Monitoring</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Observability built for autonomous AI agents.
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect your Python, TypeScript, and Go LLM agents in seconds.
                Stream token metrics, latency percentiles, and tool execution graphs with high-fidelity OpenTelemetry traces.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-200">
                    Sub-Millisecond Trace Pipeline
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    High-throughput ClickHouse ingest engine capable of millions of telemetry spans.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-200">
                    Autonomous Agent & Tool Inspection
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Trace step-by-step reasoning chains, prompt context, and tool invocation errors.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-200">
                    Granular API Keys & Access Rules
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Provision scoped ingestion tokens per environment with rate-limits and instant revocation.
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial / Live Status Card */}
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Production Ingestion Cluster: 99.99% Uptime</span>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c0f17] p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/50 backdrop-blur-md">
              {/* Header inside card */}
              <div className="space-y-1.5 mb-6 text-center sm:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Sign in to ASI:Telemetry
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Access your AI telemetry dashboards and manage API keys.
                </p>
              </div>

              {/* 1-Click Demo Login Banner */}
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={isLoading}
                className="w-full mb-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-current text-yellow-300" />
                <span>Quick Demo Login (Lead Architect)</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </button>

              <div className="relative flex items-center justify-center mb-5">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                <span className="absolute bg-white dark:bg-[#0c0f17] px-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  or sign in with email
                </span>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Work Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-9 pr-10 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Remember this workstation for 30 days
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>

              {/* OAuth Providers */}
              <div className="mt-5 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  <span className="absolute bg-white dark:bg-[#0c0f17] px-2 text-[10px] text-slate-400 uppercase tracking-wider">
                    Or single sign-on
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    className="flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>GitHub</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    className="flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  New to ASI:Telemetry?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Create an account
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0f17] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Reset Password
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  We&apos;ll send a password recovery token to your email.
                </p>
              </div>
            </div>

            {forgotEmailSent ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Recovery link sent to your inbox. Check spam if not found.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotEmailSent(false);
                  }}
                  className="w-full h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  defaultValue={email}
                  placeholder="Enter your registered email"
                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotEmailSent(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors shadow-xs"
                  >
                    Send Recovery Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/60 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-500 z-10 gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-blue-500" />
          <span>SOC-2 Type II Certified • 256-Bit Telemetry Ingest TLS Encryption</span>
        </div>
        <div>
          &copy; {new Date().getFullYear()} ASI:Telemetry. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

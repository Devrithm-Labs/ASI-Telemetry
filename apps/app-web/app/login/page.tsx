"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, Eye, EyeOff, KeyRound, Lock, Mail, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { loginUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setErrorMsg(null);
    setIsLoading(true);

    const result = await loginUser(loginEmail, loginPass);
    setIsLoading(false);
    if (!result.success) {
      setErrorMsg(result.error || "Login failed. Please check your credentials.");
      return;
    }

    const rawFrom =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("from")
        : null;
    const target =
      rawFrom && rawFrom !== "/login" && rawFrom !== "/signup"
        ? rawFrom
        : "/dashboard";
    router.push(target);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    await performLogin(cleanEmail, password);
  };

  const handleAutofillDemo = () => {
    setEmail("demo@asi-telemetry.io");
    setPassword("DemoUser123!");
    setErrorMsg(null);
  };

  const handleOneClickDemo = async () => {
    setEmail("demo@asi-telemetry.io");
    setPassword("DemoUser123!");
    await performLogin("demo@asi-telemetry.io", "DemoUser123!");
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-foreground">
            ASI:Telemetry
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Centered Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1.5 text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Sign In
            </h1>
            <p className="text-xs text-muted-foreground">
              Enter your credentials to access your telemetry workspace
            </p>
          </div>

          {/* Quick Demo Access Box */}
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Live Showcase Account</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Ready</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Explore with pre-seeded agent telemetry, traces, and metrics.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAutofillDemo}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md border border-border bg-background hover:bg-muted text-foreground font-medium text-xs transition-colors cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Autofill</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleOneClickDemo}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>1-Click Login</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-border text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-foreground hover:underline ml-1"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/80 px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ASI:Telemetry. Observability for Autonomous AI Agent Swarms.
      </footer>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { signupUser } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    const result = await signupUser(cleanName, cleanEmail, password);
    setIsLoading(false);
    if (!result.success) {
      setErrorMsg(result.error || "Registration failed. Please try again.");
      return;
    }

    const target =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("from") || "/dashboard"
        : "/dashboard";
    router.push(target);
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
              Create an account
            </h1>
            <p className="text-xs text-muted-foreground">
              Get started with ASI:Telemetry in seconds
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  required
                  autoFocus
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
                />
              </div>
            </div>

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
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
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
                  <span>Creating Account...</span>
                </div>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-border text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-foreground hover:underline ml-1"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="w-full border-t border-border px-6 py-4 text-center text-[11px] text-muted-foreground">
        &copy; {new Date().getFullYear()} ASI:Telemetry. All rights reserved.
      </footer>
    </div>
  );
}

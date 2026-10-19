"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Briefcase,
  Building,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { saveStoredUser } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [role, setRole] = React.useState("Lead AI Engineer");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Password strength calculation
  const passwordCriteria = React.useMemo(() => {
    return {
      hasMinLen: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = React.useMemo(() => {
    let score = 0;
    if (passwordCriteria.hasMinLen) score += 20;
    if (passwordCriteria.hasUpper) score += 20;
    if (passwordCriteria.hasLower) score += 20;
    if (passwordCriteria.hasNumber) score += 20;
    if (passwordCriteria.hasSpecial) score += 20;
    return score;
  }, [passwordCriteria]);

  const getStrengthLabel = () => {
    if (strengthScore <= 20) return { label: "Very Weak", color: "bg-rose-500", text: "text-rose-500" };
    if (strengthScore <= 40) return { label: "Weak", color: "bg-orange-500", text: "text-orange-500" };
    if (strengthScore <= 60) return { label: "Medium", color: "bg-amber-500", text: "text-amber-500" };
    if (strengthScore <= 80) return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
    return { label: "Ultra Secure", color: "bg-emerald-400", text: "text-emerald-400" };
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setErrorMsg("Please fill in your name, work email, and password.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg("Please accept the terms and conditions to proceed.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      saveStoredUser({
        id: `usr_${Date.now()}`,
        name: fullName,
        email: email,
        company: company || "Independent AI Developer",
        role: role,
      });

      setIsLoading(false);
      // Navigate to API Keys page so they can immediately generate their first key!
      router.push("/api-keys");
    }, 700);
  };

  const handleQuickDemoFill = () => {
    setFullName("Sarah Connor");
    setEmail("sarah.c@cyberdyne.ai");
    setCompany("Cyberdyne Systems");
    setPassword("Observability#2026");
    setRole("Lead AI Engineer");
    setAgreedToTerms(true);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 selection:bg-blue-600/30 selection:text-blue-600 transition-colors">
      {/* Decorative Glow */}
      <div className="absolute top-10 right-1/4 -z-10 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none dark:bg-blue-600/15" />
      <div className="absolute bottom-10 left-1/4 -z-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none dark:bg-cyan-600/15" />

      {/* Top Header */}
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
            Already have an account?
          </span>
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            Sign In
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Signup Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Plan Benefits & Visual */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-medium w-fit">
              <Zap className="h-3.5 w-3.5" />
              <span>Instant Setup • No Credit Card Required</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Start streaming telemetry in less than 3 minutes.
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Join thousands of AI engineering teams observing autonomous multi-agent systems, LLM latency budgets, and tool usage across production clusters.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-4 space-y-3 backdrop-blur-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Included in Developer Tier:
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Unlimited API keys with environment segmentation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>5,000,000 trace spans ingested per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Python & TypeScript SDK zero-code auto-instrumentation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Real-time percentiles (p50, p95, p99) & error heatmaps</span>
                </li>
              </ul>
            </div>

            {/* Quick Demo Pre-fill helper */}
            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between">
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Want to test quickly?
              </div>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Auto-fill demo fields
              </button>
            </div>
          </div>

          {/* Right Column: Sign Up Form Card */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c0f17] p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/50 backdrop-blur-md">
              <div className="space-y-1 mb-5">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Create your ASI:Telemetry account
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Generate scoped API keys and start tracing your AI applications today.
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Full Name *
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Vance"
                        required
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Work Email *
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        required
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Company / Organization
                    </label>
                    <div className="relative flex items-center">
                      <Building className="absolute left-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Devrithm Labs"
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Primary Role
                    </label>
                    <div className="relative flex items-center">
                      <Briefcase className="absolute left-3 h-4 w-4 text-slate-400" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      >
                        <option value="Lead AI Engineer">Lead AI Engineer</option>
                        <option value="MLOps / Platform Architect">MLOps / Platform Architect</option>
                        <option value="Backend Developer">Backend Developer</option>
                        <option value="AI Researcher / Scientist">AI Researcher / Scientist</option>
                        <option value="Executive / Founder">Executive / Founder</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password *
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters with numbers & symbols"
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

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Security Strength:</span>
                        <span className={`font-semibold ${getStrengthLabel().text}`}>
                          {getStrengthLabel().label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthLabel().color}`}
                          style={{ width: `${strengthScore}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-400">
                        <span className={passwordCriteria.hasMinLen ? "text-emerald-500" : ""}>
                          ✓ 8+ chars
                        </span>
                        <span className={passwordCriteria.hasUpper ? "text-emerald-500" : ""}>
                          ✓ Uppercase
                        </span>
                        <span className={passwordCriteria.hasNumber ? "text-emerald-500" : ""}>
                          ✓ Number
                        </span>
                        <span className={passwordCriteria.hasSpecial ? "text-emerald-500" : ""}>
                          ✓ Symbol
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Terms agreement checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    I agree to the{" "}
                    <span className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</span>{" "}
                    and{" "}
                    <span className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</span>.
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account & Provisioning Workspace...</span>
                    </div>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Create Account & Generate API Key</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </>
                  )}
                </button>
              </form>

              {/* OAuth Providers */}
              <div className="mt-5 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  <span className="absolute bg-white dark:bg-[#0c0f17] px-2 text-[10px] text-slate-400 uppercase tracking-wider">
                    Or sign up with
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleQuickDemoFill}
                    className="flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>GitHub</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickDemoFill}
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
              <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Log In
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

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

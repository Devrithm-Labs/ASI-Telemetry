"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Briefcase,
  Building,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  User,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { signupUser } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [role, setRole] = React.useState("Lead AI Engineer");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
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
    if (passwordCriteria.hasMinLen) score += 25;
    if (passwordCriteria.hasUpper && passwordCriteria.hasLower) score += 25;
    if (passwordCriteria.hasNumber) score += 25;
    if (passwordCriteria.hasSpecial) score += 25;
    return score;
  }, [passwordCriteria]);

  const getStrengthLabel = () => {
    if (strengthScore <= 25) return { label: "Weak", color: "bg-destructive", text: "text-destructive" };
    if (strengthScore <= 50) return { label: "Fair", color: "bg-muted-foreground", text: "text-muted-foreground" };
    if (strengthScore <= 75) return { label: "Good", color: "bg-foreground/70", text: "text-foreground" };
    return { label: "Strong", color: "bg-foreground", text: "text-foreground" };
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (strengthScore < 50) {
      setErrorMsg("Please choose a stronger password (at least 8 chars with upper, numbers or symbols).");
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg("You must accept the Terms of Service & Privacy Policy.");
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    const result = await signupUser(fullName, email, password, company, role);
    setIsLoading(false);
    if (!result.success) {
      setErrorMsg(result.error || "Registration failed.");
      return;
    }
    router.push("/api-keys");
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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-background text-foreground transition-colors">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md z-20">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-foreground">
              ASI:Telemetry
            </span>
            <span className="text-[10px] text-muted-foreground font-mono -mt-0.5">
              AI Observability & Trace Pipeline
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Already have an account?
          </span>
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Sign In
          </Link>
          <div className="h-4 w-px bg-border" />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Signup Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Plan Benefits & Visual */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted text-foreground text-xs font-medium w-fit">
              <Zap className="h-3.5 w-3.5" />
              <span>Instant Setup • No Credit Card Required</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                Start streaming telemetry in less than 3 minutes.
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Join thousands of AI engineering teams observing autonomous multi-agent systems, LLM latency budgets, and tool usage across production clusters.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Included in Developer Tier:
              </div>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                  <span>Unlimited API keys with environment segmentation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                  <span>5,000,000 trace spans ingested per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                  <span>Interactive Agent Swarm DAG and Collective Tracing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                  <span>Real-time percentiles (p50, p95, p99) & error heatmaps</span>
                </li>
              </ul>
            </div>

            {/* Quick Demo Pre-fill helper */}
            <div className="p-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Want to test quickly?
              </div>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-xs font-semibold text-foreground hover:underline cursor-pointer"
              >
                Auto-fill demo fields
              </button>
            </div>
          </div>

          {/* Right Column: Sign Up Form Card */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
              <div className="space-y-1 mb-5">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Create your ASI:Telemetry account
                </h2>
                <p className="text-xs text-muted-foreground">
                  Generate scoped API keys and start tracing your AI applications today.
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-foreground">
                      Full Name *
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Vance"
                        required
                        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-foreground">
                      Work Email *
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        required
                        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-foreground">
                      Company / Organization
                    </label>
                    <div className="relative flex items-center">
                      <Building className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Devrithm Labs"
                        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-foreground">
                      Primary Role
                    </label>
                    <div className="relative flex items-center">
                      <Briefcase className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
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
                  <label className="block text-xs font-medium text-foreground">
                    Password *
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters with numbers & symbols"
                      required
                      className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
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
                        <span className="text-muted-foreground">Security Strength:</span>
                        <span className={`font-semibold ${getStrengthLabel().text}`}>
                          {getStrengthLabel().label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthLabel().color}`}
                          style={{ width: `${strengthScore}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-muted-foreground">
                        <span className={passwordCriteria.hasMinLen ? "text-foreground font-medium" : ""}>
                          ✓ 8+ chars
                        </span>
                        <span className={passwordCriteria.hasUpper ? "text-foreground font-medium" : ""}>
                          ✓ Uppercase
                        </span>
                        <span className={passwordCriteria.hasNumber ? "text-foreground font-medium" : ""}>
                          ✓ Number
                        </span>
                        <span className={passwordCriteria.hasSpecial ? "text-foreground font-medium" : ""}>
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
                    className="mt-0.5 h-3.5 w-3.5 rounded border-input bg-background accent-foreground cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                    I agree to the{" "}
                    <span className="text-foreground font-medium underline">Terms of Service</span>{" "}
                    and{" "}
                    <span className="text-foreground font-medium underline">Privacy Policy</span>.
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
                  <div className="w-full border-t border-border" />
                  <span className="absolute bg-card px-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                    Or sign up with
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleQuickDemoFill}
                    className="flex items-center justify-center gap-2 h-9 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>GitHub</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickDemoFill}
                    className="flex items-center justify-center gap-2 h-9 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
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
              <div className="mt-5 pt-3.5 border-t border-border text-center">
                <span className="text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-foreground hover:underline"
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
      <footer className="w-full border-t border-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground z-10 gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span>SOC-2 Type II Certified • 256-Bit Telemetry Ingest TLS Encryption</span>
        </div>
        <div>
          &copy; {new Date().getFullYear()} ASI:Telemetry. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

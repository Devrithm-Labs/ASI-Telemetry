/**
 * OpenTelemetry-compatible Telemetry Data Types
 * for AI Agent Observability (ASI-Telemetry)
 */

export type TraceStatus = "ok" | "error" | "running";

export type SpanType =
  | "llm"
  | "tool"
  | "retriever"
  | "agent"
  | "chain"
  | "guardrail";

export type ScoreSource = "human" | "llm-judge" | "rule";

export interface SpanError {
  message: string;
  stack?: string;
  code?: string;
}

export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string | null;
  name: string;
  type: SpanType;
  status: TraceStatus;
  startTime: string; // ISO 8601
  endTime?: string;
  durationMs: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  input?: unknown;
  output?: unknown;
  error?: SpanError;
  attributes?: Record<string, unknown>;
  children?: Span[]; // Populated in tree view
}

export interface Score {
  id: string;
  traceId: string;
  spanId?: string;
  name: string;
  value: number; // normalized (e.g. 0-1) or rating
  source: ScoreSource;
  comment?: string;
  createdAt: string;
}

export interface Trace {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  sessionId?: string;
  userId?: string;
  status: TraceStatus;
  startTime: string; // ISO 8601
  endTime?: string;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  tags: string[];
  input: unknown;
  output: unknown;
  metadata?: Record<string, unknown>;
  spans?: Span[];
  scores?: Score[];
}

export interface Session {
  id: string;
  agentId: string;
  agentName: string;
  userId?: string;
  traceCount: number;
  totalTokens: number;
  totalCostUsd: number;
  durationMs: number;
  startTime: string;
  lastActiveAt: string;
  status: "active" | "completed" | "error";
  firstInputSnippet?: string;
}

export interface Agent {
  id: string;
  name: string;
  version: string;
  description: string;
  defaultModel: string;
  traceCount: number;
  successRate: number; // 0 to 1
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
  status: "active" | "inactive";
  dependencies?: string[]; // IDs of agents it calls
}

export interface AlertRule {
  id: string;
  name: string;
  metric: "error_rate" | "p95_latency" | "total_cost" | "token_burn";
  operator: ">" | ">=" | "<" | "<=";
  threshold: number;
  unit: "%" | "ms" | "$" | "tokens";
  windowMinutes: number;
  channel: "slack" | "pagerduty" | "email" | "webhook";
  channelTarget: string;
  enabled: boolean;
  lastTriggeredAt?: string;
}

export interface AlertIncident {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: "critical" | "warning" | "info";
  value: number;
  threshold: number;
  unit: string;
  timestamp: string;
  status: "active" | "acknowledged" | "resolved";
}

export interface DateRange {
  from: Date;
  to: Date;
  preset?: "1h" | "24h" | "7d" | "30d" | "custom";
}

export interface TraceFilters {
  search?: string;
  status?: TraceStatus[];
  agentId?: string[];
  models?: string[];
  tags?: string[];
  latencyMinMs?: number;
  latencyMaxMs?: number;
  costMinUsd?: number;
  costMaxUsd?: number;
  sessionId?: string;
  userId?: string;
  dateRange?: DateRange;
}

export interface OverviewKPIs {
  totalTraces: number;
  totalTracesDeltaPct: number;
  errorRate: number; // e.g. 0.042 (4.2%)
  errorRateDeltaPct: number;
  p50LatencyMs: number;
  p50LatencyDeltaPct: number;
  p95LatencyMs: number;
  p95LatencyDeltaPct: number;
  totalTokens: number;
  totalTokensDeltaPct: number;
  totalCostUsd: number;
  totalCostDeltaPct: number;
  sparklines: {
    traces: number[];
    errorRate: number[];
    latency: number[];
    tokens: number[];
    cost: number[];
  };
}

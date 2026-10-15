export interface LLMTraceRecord {
  id: string;
  trace_id: string;
  span_id?: string;
  parent_id?: string | null;
  name: string;
  run_type: string;
  status: "success" | "error";
  model: string;
  input: string;
  output?: string | null;
  error?: string | null;
  start_time: string;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  metadata?: Record<string, any>;
}

export type MonitoringTab =
  | "all"
  | "traces"
  | "llm-calls"
  | "cost-tokens"
  | "tools";

export interface TabMeta {
  id: MonitoringTab;
  label: string;
  badge?: string;
}

export interface LLMMetricsSummary {
  totalCount: number;
  errorCount: number;
  successCount: number;
  successRate: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
}
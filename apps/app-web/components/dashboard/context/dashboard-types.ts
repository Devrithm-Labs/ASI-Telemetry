export type TimeRange = "1h" | "24h" | "7d" | "30d";

export type MetricTab = "traces" | "llm" | "latency" | "cpu" | "errors";

export interface RequestMetricPoint {
  time: string;
  success: number;
  failure: number;
  total: number;
}

export interface LatencyMetricPoint {
  time: string;
  p50: number;
  p90: number;
  p99: number;
  slaLimit: number;
}

export interface CpuMetricPoint {
  time: string;
  cpuPercent: number;
  memoryPercent: number;
  coreLoad: number;
}

export interface ErrorMetricPoint {
  time: string;
  errorRate: number;
  timeout: number;
  rateLimit: number;
  serverError: number;
  validationError: number;
}

export interface TraceRecord {
  id: string;
  name: string;
  service: string;
  status: "success" | "error" | "rate_limited";
  statusCode: number;
  latencyMs: number;
  cpuPercent: number;
  tokens: number;
  model: string;
  timestamp: string;
  errorMessage?: string;
  spans: {
    name: string;
    durationMs: number;
    status: "ok" | "error";
  }[];
}

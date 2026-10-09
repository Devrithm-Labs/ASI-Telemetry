export type TimeRange = "1h" | "24h" | "7d" | "30d";

export type MetricTab = "traces" | "llm" | "response-time" | "latency" | "cpu" | "errors";

export interface RequestMetricPoint {
  time: string;
  success: number;
  failure: number;
  total: number;
}

export interface ResponseTimeMetricPoint {
  time: string;
  p50: number;
  p90: number;
  p95?: number;
  p99: number;
  slaLimit: number;
}

// Backwards-compatible alias for ResponseTimeMetricPoint
export type LatencyMetricPoint = ResponseTimeMetricPoint;

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
  responseTimeMs: number;
  latencyMs: number; // Backwards-compatible alias
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

export interface MetricSummary {
  total_requests: number;
  total_success: number;
  total_errors: number;
  success_rate: number;
  error_rate: number;
  avg_response_time_ms: number;
  current_cpu: number;
  current_memory: number;
}

export interface ApplicationMetadata {
  agent_name: string;
  functions: string[];
}

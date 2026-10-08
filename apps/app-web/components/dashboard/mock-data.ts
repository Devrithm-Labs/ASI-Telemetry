import {
  RequestMetricPoint,
  LatencyMetricPoint,
  CpuMetricPoint,
  ErrorMetricPoint,
  TraceRecord,
  TimeRange,
} from "./dashboard-types";

export const getRequestData = (range: TimeRange): RequestMetricPoint[] => {
  switch (range) {
    case "1h":
      return [
        { time: "18:00", success: 1240, failure: 12, total: 1252 },
        { time: "18:10", success: 1380, failure: 18, total: 1398 },
        { time: "18:20", success: 1620, failure: 9, total: 1629 },
        { time: "18:30", success: 1890, failure: 28, total: 1918 },
        { time: "18:40", success: 1540, failure: 14, total: 1554 },
        { time: "18:50", success: 1720, failure: 16, total: 1736 },
        { time: "19:00", success: 1980, failure: 22, total: 2002 },
      ];
    case "24h":
      return [
        { time: "00:00", success: 4200, failure: 35, total: 4235 },
        { time: "04:00", success: 2800, failure: 20, total: 2820 },
        { time: "08:00", success: 8900, failure: 92, total: 8992 },
        { time: "12:00", success: 14200, failure: 148, total: 14348 },
        { time: "16:00", success: 16800, failure: 195, total: 16995 },
        { time: "20:00", success: 11900, failure: 112, total: 12012 },
        { time: "23:59", success: 6500, failure: 48, total: 6548 },
      ];
    case "7d":
    default:
      return [
        { time: "10/02", success: 320400, failure: 2800, total: 323200 },
        { time: "10/03", success: 385100, failure: 3100, total: 388200 },
        { time: "10/04", success: 412000, failure: 4200, total: 416200 },
        { time: "10/05", success: 398200, failure: 3400, total: 401600 },
        { time: "10/06", success: 445800, failure: 4900, total: 450700 },
        { time: "10/07", success: 462100, failure: 3950, total: 466050 },
        { time: "10/08", success: 489500, failure: 3620, total: 493120 },
      ];
    case "30d":
      return [
        { time: "W1", success: 2150000, failure: 19200, total: 2169200 },
        { time: "W2", success: 2420000, failure: 21800, total: 2441800 },
        { time: "W3", success: 2680000, failure: 23100, total: 2703100 },
        { time: "W4", success: 2980000, failure: 24500, total: 3004500 },
      ];
  }
};

export const getLatencyData = (range: TimeRange): LatencyMetricPoint[] => {
  switch (range) {
    case "1h":
      return [
        { time: "18:00", p50: 45, p90: 140, p99: 410, slaLimit: 300 },
        { time: "18:10", p50: 42, p90: 135, p99: 390, slaLimit: 300 },
        { time: "18:20", p50: 48, p90: 160, p99: 460, slaLimit: 300 },
        { time: "18:30", p50: 55, p90: 185, p99: 520, slaLimit: 300 },
        { time: "18:40", p50: 46, p90: 145, p99: 420, slaLimit: 300 },
        { time: "18:50", p50: 43, p90: 138, p99: 395, slaLimit: 300 },
        { time: "19:00", p50: 41, p90: 130, p99: 375, slaLimit: 300 },
      ];
    case "24h":
      return [
        { time: "00:00", p50: 38, p90: 110, p99: 310, slaLimit: 300 },
        { time: "04:00", p50: 36, p90: 95, p99: 280, slaLimit: 300 },
        { time: "08:00", p50: 48, p90: 148, p99: 430, slaLimit: 300 },
        { time: "12:00", p50: 58, p90: 195, p99: 580, slaLimit: 300 },
        { time: "16:00", p50: 62, p90: 210, p99: 610, slaLimit: 300 },
        { time: "20:00", p50: 49, p90: 155, p99: 450, slaLimit: 300 },
        { time: "23:59", p50: 40, p90: 120, p99: 340, slaLimit: 300 },
      ];
    case "7d":
    default:
      return [
        { time: "10/02", p50: 42, p90: 132, p99: 380, slaLimit: 300 },
        { time: "10/03", p50: 44, p90: 141, p99: 410, slaLimit: 300 },
        { time: "10/04", p50: 46, p90: 152, p99: 440, slaLimit: 300 },
        { time: "10/05", p50: 43, p90: 139, p99: 390, slaLimit: 300 },
        { time: "10/06", p50: 48, p90: 165, p99: 490, slaLimit: 300 },
        { time: "10/07", p50: 45, p90: 150, p99: 430, slaLimit: 300 },
        { time: "10/08", p50: 41, p90: 135, p99: 370, slaLimit: 300 },
      ];
    case "30d":
      return [
        { time: "W1", p50: 46, p90: 150, p99: 430, slaLimit: 300 },
        { time: "W2", p50: 44, p90: 142, p99: 400, slaLimit: 300 },
        { time: "W3", p50: 43, p90: 138, p99: 385, slaLimit: 300 },
        { time: "W4", p50: 41, p90: 132, p99: 370, slaLimit: 300 },
      ];
  }
};

export const getCpuData = (range: TimeRange): CpuMetricPoint[] => {
  switch (range) {
    case "1h":
      return [
        { time: "18:00", cpuPercent: 32, memoryPercent: 48, coreLoad: 5.1 },
        { time: "18:10", cpuPercent: 36, memoryPercent: 49, coreLoad: 5.8 },
        { time: "18:20", cpuPercent: 44, memoryPercent: 51, coreLoad: 7.2 },
        { time: "18:30", cpuPercent: 52, memoryPercent: 54, coreLoad: 8.5 },
        { time: "18:40", cpuPercent: 41, memoryPercent: 52, coreLoad: 6.6 },
        { time: "18:50", cpuPercent: 38, memoryPercent: 50, coreLoad: 6.1 },
        { time: "19:00", cpuPercent: 35, memoryPercent: 49, coreLoad: 5.5 },
      ];
    case "24h":
      return [
        { time: "00:00", cpuPercent: 24, memoryPercent: 42, coreLoad: 3.8 },
        { time: "04:00", cpuPercent: 18, memoryPercent: 39, coreLoad: 2.9 },
        { time: "08:00", cpuPercent: 42, memoryPercent: 49, coreLoad: 6.7 },
        { time: "12:00", cpuPercent: 58, memoryPercent: 57, coreLoad: 9.3 },
        { time: "16:00", cpuPercent: 64, memoryPercent: 62, coreLoad: 10.2 },
        { time: "20:00", cpuPercent: 48, memoryPercent: 53, coreLoad: 7.6 },
        { time: "23:59", cpuPercent: 29, memoryPercent: 45, coreLoad: 4.6 },
      ];
    case "7d":
    default:
      return [
        { time: "10/02", cpuPercent: 34, memoryPercent: 46, coreLoad: 5.4 },
        { time: "10/03", cpuPercent: 38, memoryPercent: 49, coreLoad: 6.1 },
        { time: "10/04", cpuPercent: 42, memoryPercent: 52, coreLoad: 6.7 },
        { time: "10/05", cpuPercent: 39, memoryPercent: 50, coreLoad: 6.2 },
        { time: "10/06", cpuPercent: 46, memoryPercent: 55, coreLoad: 7.4 },
        { time: "10/07", cpuPercent: 43, memoryPercent: 53, coreLoad: 6.9 },
        { time: "10/08", cpuPercent: 38, memoryPercent: 51, coreLoad: 6.0 },
      ];
    case "30d":
      return [
        { time: "W1", cpuPercent: 39, memoryPercent: 48, coreLoad: 6.2 },
        { time: "W2", cpuPercent: 41, memoryPercent: 50, coreLoad: 6.5 },
        { time: "W3", cpuPercent: 43, memoryPercent: 52, coreLoad: 6.9 },
        { time: "W4", cpuPercent: 40, memoryPercent: 51, coreLoad: 6.4 },
      ];
  }
};

export const getErrorData = (range: TimeRange): ErrorMetricPoint[] => {
  switch (range) {
    case "1h":
      return [
        { time: "18:00", errorRate: 0.95, timeout: 4, rateLimit: 5, serverError: 2, validationError: 1 },
        { time: "18:10", errorRate: 1.28, timeout: 6, rateLimit: 8, serverError: 3, validationError: 1 },
        { time: "18:20", errorRate: 0.55, timeout: 2, rateLimit: 4, serverError: 2, validationError: 1 },
        { time: "18:30", errorRate: 1.45, timeout: 10, rateLimit: 12, serverError: 4, validationError: 2 },
        { time: "18:40", errorRate: 0.90, timeout: 4, rateLimit: 6, serverError: 3, validationError: 1 },
        { time: "18:50", errorRate: 0.92, timeout: 5, rateLimit: 7, serverError: 3, validationError: 1 },
        { time: "19:00", errorRate: 1.09, timeout: 7, rateLimit: 9, serverError: 4, validationError: 2 },
      ];
    case "24h":
      return [
        { time: "00:00", errorRate: 0.82, timeout: 10, rateLimit: 15, serverError: 8, validationError: 2 },
        { time: "04:00", errorRate: 0.70, timeout: 6, rateLimit: 9, serverError: 4, validationError: 1 },
        { time: "08:00", errorRate: 1.02, timeout: 28, rateLimit: 40, serverError: 18, validationError: 6 },
        { time: "12:00", errorRate: 1.03, timeout: 44, rateLimit: 62, serverError: 31, validationError: 11 },
        { time: "16:00", errorRate: 1.14, timeout: 58, rateLimit: 82, serverError: 40, validationError: 15 },
        { time: "20:00", errorRate: 0.93, timeout: 32, rateLimit: 48, serverError: 24, validationError: 8 },
        { time: "23:59", errorRate: 0.73, timeout: 14, rateLimit: 20, serverError: 10, validationError: 4 },
      ];
    case "7d":
    default:
      return [
        { time: "10/02", errorRate: 0.86, timeout: 840, rateLimit: 1200, serverError: 560, validationError: 200 },
        { time: "10/03", errorRate: 0.79, timeout: 920, rateLimit: 1350, serverError: 610, validationError: 220 },
        { time: "10/04", errorRate: 1.00, timeout: 1260, rateLimit: 1840, serverError: 820, validationError: 280 },
        { time: "10/05", errorRate: 0.84, timeout: 1020, rateLimit: 1480, serverError: 680, validationError: 220 },
        { time: "10/06", errorRate: 1.08, timeout: 1480, rateLimit: 2150, serverError: 940, validationError: 330 },
        { time: "10/07", errorRate: 0.84, timeout: 1180, rateLimit: 1720, serverError: 780, validationError: 270 },
        { time: "10/08", errorRate: 0.73, timeout: 1080, rateLimit: 1580, serverError: 710, validationError: 250 },
      ];
    case "30d":
      return [
        { time: "W1", errorRate: 0.88, timeout: 5800, rateLimit: 8400, serverError: 3800, validationError: 1200 },
        { time: "W2", errorRate: 0.89, timeout: 6500, rateLimit: 9500, serverError: 4300, validationError: 1500 },
        { time: "W3", errorRate: 0.85, timeout: 7000, rateLimit: 10100, serverError: 4500, validationError: 1500 },
        { time: "W4", errorRate: 0.81, timeout: 7400, rateLimit: 10700, serverError: 4800, validationError: 1600 },
      ];
  }
};

export const INITIAL_TRACES: TraceRecord[] = [
  {
    id: "trc-89b4a1f0",
    name: "agent.planner.synthesize_plan",
    service: "agent-runtime-core",
    status: "success",
    statusCode: 200,
    latencyMs: 142,
    cpuPercent: 34.2,
    tokens: 2840,
    model: "claude-3-5-sonnet",
    timestamp: "10/08 18:54:12",
    spans: [
      { name: "context.retrieval", durationMs: 24, status: "ok" },
      { name: "prompt.template.compile", durationMs: 4, status: "ok" },
      { name: "llm.stream_generation", durationMs: 108, status: "ok" },
      { name: "output.parse_and_validate", durationMs: 6, status: "ok" },
    ],
  },
  {
    id: "trc-47c9e3d2",
    name: "rag.vector.semantic_search",
    service: "vector-indexer-svc",
    status: "success",
    statusCode: 200,
    latencyMs: 38,
    cpuPercent: 28.5,
    tokens: 420,
    model: "text-embedding-3-large",
    timestamp: "10/08 18:53:48",
    spans: [
      { name: "embed.query_vector", durationMs: 16, status: "ok" },
      { name: "qdrant.ann_search", durationMs: 18, status: "ok" },
      { name: "rerank.cross_encoder", durationMs: 4, status: "ok" },
    ],
  },
  {
    id: "trc-19f8a4b6",
    name: "tool.sandbox.bash_exec",
    service: "sandbox-runner",
    status: "error",
    statusCode: 504,
    latencyMs: 4210,
    cpuPercent: 78.4,
    tokens: 610,
    model: "system-container",
    timestamp: "10/08 18:52:30",
    errorMessage: "ExecutionTimeout: Process failed to yield stdout within 4000ms SLA threshold",
    spans: [
      { name: "container.alloc", durationMs: 85, status: "ok" },
      { name: "stdin.write", durationMs: 2, status: "ok" },
      { name: "process.exec_wait", durationMs: 4000, status: "error" },
      { name: "sigkill.drain", durationMs: 123, status: "ok" },
    ],
  },
  {
    id: "trc-52d1b7a9",
    name: "llm.completion.structured_extract",
    service: "agent-runtime-core",
    status: "rate_limited",
    statusCode: 429,
    latencyMs: 82,
    cpuPercent: 18.2,
    tokens: 1890,
    model: "gpt-4o",
    timestamp: "10/08 18:51:19",
    errorMessage: "RateLimitError: Tokens Per Minute (TPM) limit exceeded for tier org-enterprise",
    spans: [
      { name: "auth.verify_token", durationMs: 8, status: "ok" },
      { name: "rate_limiter.check_token_bucket", durationMs: 4, status: "error" },
      { name: "retry_policy.enqueue_backoff", durationMs: 70, status: "error" },
    ],
  },
  {
    id: "trc-68a3f9e1",
    name: "db.telemetry.batch_flush",
    service: "collector-pipeline",
    status: "success",
    statusCode: 200,
    latencyMs: 54,
    cpuPercent: 44.1,
    tokens: 0,
    model: "clickhouse-v24",
    timestamp: "10/08 18:50:05",
    spans: [
      { name: "batch.serialize_proto", durationMs: 12, status: "ok" },
      { name: "tcp.socket_write", durationMs: 38, status: "ok" },
      { name: "ack.verify", durationMs: 4, status: "ok" },
    ],
  },
  {
    id: "trc-33e5c7d8",
    name: "agent.tool_call.browser_action",
    service: "browser-worker",
    status: "success",
    statusCode: 200,
    latencyMs: 312,
    cpuPercent: 58.7,
    tokens: 1450,
    model: "playwright-headless",
    timestamp: "10/08 18:49:22",
    spans: [
      { name: "page.navigate", durationMs: 140, status: "ok" },
      { name: "element.wait_for_selector", durationMs: 65, status: "ok" },
      { name: "screenshot.capture_buffer", durationMs: 82, status: "ok" },
      { name: "ocr.extract_text", durationMs: 25, status: "ok" },
    ],
  },
  {
    id: "trc-91b2c4e5",
    name: "evaluator.ground_truth.score",
    service: "eval-engine",
    status: "success",
    statusCode: 200,
    latencyMs: 98,
    cpuPercent: 24.3,
    tokens: 3120,
    model: "gemini-1.5-pro",
    timestamp: "10/08 18:48:10",
    spans: [
      { name: "reference.fetch_ground_truth", durationMs: 14, status: "ok" },
      { name: "judge.llm_scoring", durationMs: 76, status: "ok" },
      { name: "metric.emit_score", durationMs: 8, status: "ok" },
    ],
  },
];

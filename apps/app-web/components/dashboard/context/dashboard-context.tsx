"use client";

import * as React from "react";
import {
  TimeRange,
  TraceRecord,
  RequestMetricPoint,
  LatencyMetricPoint,
  CpuMetricPoint,
  ErrorMetricPoint,
} from "./dashboard-types";

interface DashboardContextType {
  selectedProject: string;
  setSelectedProject: (proj: string) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  activeHeaderTab: "Monitoring" | "Dashboards" | "Alerts";
  setActiveHeaderTab: (tab: "Monitoring" | "Dashboards" | "Alerts") => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  requestData: RequestMetricPoint[];
  latencyData: LatencyMetricPoint[];
  cpuData: CpuMetricPoint[];
  errorData: ErrorMetricPoint[];
  handleRefresh: () => Promise<void> | void;
  traces: TraceRecord[];
  setTraces: React.Dispatch<React.SetStateAction<TraceRecord[]>>;
  addTrace: (trace: TraceRecord) => void;
  selectedTrace: TraceRecord | null;
  setSelectedTrace: (trace: TraceRecord | null) => void;
  isAlertModalOpen: boolean;
  setIsAlertModalOpen: (open: boolean) => void;
  isDashboardModalOpen: boolean;
  setIsDashboardModalOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const DashboardContext = React.createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedProject, setSelectedProject] = React.useState("assistant");
  const [timeRange, setTimeRange] = React.useState<TimeRange>("7d");
  const [activeHeaderTab, setActiveHeaderTab] = React.useState<
    "Monitoring" | "Dashboards" | "Alerts"
  >("Monitoring");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Modals state
  const [selectedTrace, setSelectedTrace] = React.useState<TraceRecord | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = React.useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = React.useState(false);

  // Live telemetry state (from real ClickHouse database)
  const [isLive, setIsLive] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [requestData, setRequestData] = React.useState<RequestMetricPoint[]>([]);
  const [latencyData, setLatencyData] = React.useState<LatencyMetricPoint[]>([]);
  const [cpuData, setCpuData] = React.useState<CpuMetricPoint[]>([]);
  const [errorData, setErrorData] = React.useState<ErrorMetricPoint[]>([]);
  const [traces, setTraces] = React.useState<TraceRecord[]>([]);

  const addTrace = React.useCallback((newTrace: TraceRecord) => {
    setTraces((prev) => [newTrace, ...prev]);
  }, []);

  // Fetch real data from ClickHouse backend via FastAPI
  const fetchDatabaseTelemetry = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("http://localhost:8080/api/metrics?limit=50");
      if (!res.ok) return;
      const json = await res.json();
      const records = json.data || [];

      if (Array.isArray(records) && records.length > 0) {
        // 1. Map to Real Traces
        const mappedTraces: TraceRecord[] = records.map((m: any) => ({
          id: m.id,
          name: m.func_name || "handle_message",
          service: m.agent_name || "assistant",
          status: m.status === "success" ? "success" : "error",
          statusCode: m.status === "success" ? 200 : 500,
          latencyMs: m.latency_ms || 0,
          cpuPercent: m.cpu_after || 0,
          tokens: 0,
          model: "uAgent",
          timestamp: m.timestamp
            ? m.timestamp.replace("T", " ").substring(0, 19)
            : new Date().toISOString(),
          spans: [
            {
              name: m.func_name || "handle_message",
              durationMs: m.latency_ms || 0,
              status: m.status === "success" ? "ok" : "error",
            },
          ],
        }));
        setTraces(mappedTraces.reverse());

        // 1. Sort records chronologically (oldest to newest)
        const sortedRecords = [...records].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Determine if records span within 2 minutes (use seconds) or multiple minutes (use minutes)
        const firstTime = new Date(sortedRecords[0]?.timestamp || 0).getTime();
        const lastTime = new Date(sortedRecords[sortedRecords.length - 1]?.timestamp || 0).getTime();
        const spanMinutes = (lastTime - firstTime) / (1000 * 60);

        // Group into time buckets
        const timeGroups = new Map<
          string,
          {
            success: number;
            failure: number;
            total: number;
            latencies: number[];
            cpus: number[];
            mems: number[];
          }
        >();

        for (const m of sortedRecords) {
          let timeKey = "now";
          if (m.timestamp) {
            const d = new Date(m.timestamp);
            if (!isNaN(d.getTime())) {
              const hh = d.getHours().toString().padStart(2, "0");
              const mm = d.getMinutes().toString().padStart(2, "0");
              if (spanMinutes <= 2) {
                const ss = d.getSeconds().toString().padStart(2, "0");
                timeKey = `${hh}:${mm}:${ss}`;
              } else {
                timeKey = `${hh}:${mm}`;
              }
            } else {
              timeKey = m.timestamp.substring(11, 16) || "now";
            }
          }

          const existing = timeGroups.get(timeKey) || {
            success: 0,
            failure: 0,
            total: 0,
            latencies: [],
            cpus: [],
            mems: [],
          };

          const isSuccess = m.status === "success";
          existing.success += isSuccess ? 1 : 0;
          existing.failure += isSuccess ? 0 : 1;
          existing.total += 1;
          existing.latencies.push(Number(m.latency_ms || 0));
          existing.cpus.push(Number(m.cpu_after || 0));
          existing.mems.push(Number(m.memory_after || 0));

          timeGroups.set(timeKey, existing);
        }

        const mappedReqs: RequestMetricPoint[] = [];
        const mappedLatency: LatencyMetricPoint[] = [];
        const mappedCpu: CpuMetricPoint[] = [];
        const mappedErrors: ErrorMetricPoint[] = [];

        timeGroups.forEach((group, time) => {
          // Request throughput volume for this time bucket
          mappedReqs.push({
            time,
            success: group.success,
            failure: group.failure,
            total: group.total,
          });

          // Latency percentiles
          const avgLat = Math.round(
            group.latencies.reduce((a, b) => a + b, 0) / group.latencies.length
          );
          const maxLat = Math.round(Math.max(...group.latencies));
          mappedLatency.push({
            time,
            p50: avgLat,
            p90: Math.round(avgLat * 1.1),
            p99: maxLat,
            slaLimit: 300,
          });

          // Host CPU & RAM
          const avgCpu = Math.round(
            group.cpus.reduce((a, b) => a + b, 0) / group.cpus.length
          );
          const avgMem = Math.round(
            group.mems.reduce((a, b) => a + b, 0) / group.mems.length
          );

          mappedCpu.push({
            time,
            cpuPercent: avgCpu,
            memoryPercent: avgMem,
            coreLoad: Number(((avgCpu / 100) * 4).toFixed(1)),
          });

          // Error count
          mappedErrors.push({
            time,
            errorRate:
              group.total > 0
                ? Number(((group.failure / group.total) * 100).toFixed(1))
                : 0,
            timeout: 0,
            rateLimit: 0,
            serverError: group.failure,
            validationError: 0,
          });
        });

        setRequestData(mappedReqs);
        setLatencyData(mappedLatency);
        setCpuData(mappedCpu);
        setErrorData(mappedErrors);
      } else {
        // When database is empty
        setRequestData([]);
        setLatencyData([]);
        setCpuData([]);
        setErrorData([]);
        setTraces([]);
      }
      setLastUpdated(new Date());
    } catch {
      // Backend offline; keep previous state
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Sync with ClickHouse on mount using useEffect hook and periodically when live is active
  React.useEffect(() => {
    let isMounted = true;

    // Fetch initial data from API on component mount
    fetchDatabaseTelemetry();

    if (!isLive) return;

    // Polling interval for live telemetry
    const interval = setInterval(() => {
      if (isMounted) {
        fetchDatabaseTelemetry();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLive, fetchDatabaseTelemetry]);

  // Refresh callback for manual user triggers
  const handleRefresh = React.useCallback(async () => {
    await fetchDatabaseTelemetry();
  }, [fetchDatabaseTelemetry]);

  return (
    <DashboardContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        timeRange,
        setTimeRange,
        activeHeaderTab,
        setActiveHeaderTab,
        isLive,
        setIsLive,
        isRefreshing,
        lastUpdated,
        requestData,
        latencyData,
        cpuData,
        errorData,
        handleRefresh,
        traces,
        setTraces,
        addTrace,
        selectedTrace,
        setSelectedTrace,
        isAlertModalOpen,
        setIsAlertModalOpen,
        isDashboardModalOpen,
        setIsDashboardModalOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

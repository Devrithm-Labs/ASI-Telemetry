"use client";

import * as React from "react";
import {
  TimeRange,
  TraceRecord,
  RequestMetricPoint,
  ResponseTimeMetricPoint,
  LatencyMetricPoint,
  CpuMetricPoint,
  ErrorMetricPoint,
  MetricSummary,
  ApplicationMetadata,
} from "./dashboard-types";

interface DashboardContextType {
  selectedProject: string;
  setSelectedProject: (proj: string) => void;
  selectedFunction: string;
  setSelectedFunction: (fn: string) => void;
  applications: ApplicationMetadata[];
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  activeHeaderTab: "Monitoring" | "Dashboards" | "Alerts";
  setActiveHeaderTab: (tab: "Monitoring" | "Dashboards" | "Alerts") => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  summary: MetricSummary | null;
  requestData: RequestMetricPoint[];
  responseTimeData: ResponseTimeMetricPoint[];
  latencyData: LatencyMetricPoint[]; // Backwards-compatible alias
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
  const [selectedProject, setSelectedProjectState] = React.useState("assistant");
  const [selectedFunction, setSelectedFunction] = React.useState("all");
  const [applications, setApplications] = React.useState<ApplicationMetadata[]>([
    { agent_name: "assistant", functions: ["handle_message", "test_fn"] },
    { agent_name: "test-agent", functions: ["handle_query"] },
    { agent_name: "cloud_test", functions: ["handle_message"] },
    { agent_name: "agent_test", functions: ["f1"] },
  ]);

  const [timeRange, setTimeRange] = React.useState<TimeRange>("7d");
  const [activeHeaderTab, setActiveHeaderTab] = React.useState<
    "Monitoring" | "Dashboards" | "Alerts"
  >("Monitoring");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Modals state
  const [selectedTrace, setSelectedTrace] = React.useState<TraceRecord | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = React.useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = React.useState(false);

  // Live telemetry state from backend (pre-calculated in Python controller)
  const [isLive, setIsLive] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [summary, setSummary] = React.useState<MetricSummary | null>(null);
  const [requestData, setRequestData] = React.useState<RequestMetricPoint[]>([]);
  const [responseTimeData, setResponseTimeData] = React.useState<ResponseTimeMetricPoint[]>([]);
  const [cpuData, setCpuData] = React.useState<CpuMetricPoint[]>([]);
  const [errorData, setErrorData] = React.useState<ErrorMetricPoint[]>([]);
  const [traces, setTraces] = React.useState<TraceRecord[]>([]);

  const setSelectedProject = React.useCallback((proj: string) => {
    setSelectedProjectState(proj);
    setSelectedFunction("all");
  }, []);

  const addTrace = React.useCallback((newTrace: TraceRecord) => {
    setTraces((prev) => [newTrace, ...prev]);
  }, []);

  // Fetch pre-calculated telemetry payload from FastAPI controller
  const fetchDatabaseTelemetry = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (timeRange) {
        params.set("time_range", timeRange);
      }
      if (selectedProject && selectedProject !== "all-applications") {
        params.set("agent_name", selectedProject);
      }
      if (selectedFunction && selectedFunction !== "all") {
        params.set("func_name", selectedFunction);
      }

      const res = await fetch(`http://localhost:8080/api/dashboard?${params.toString()}`);
      if (res.ok) {
        const payload = await res.json();

        // 1. Set Controller-Calculated Summary KPIs
        if (payload.summary) {
          setSummary(payload.summary);
        }

        // 2. Set Controller-Calculated Time-Series & Percentiles
        if (payload.timeseries) {
          setRequestData(payload.timeseries.requests || []);
          setResponseTimeData(payload.timeseries.response_time || []);
          setCpuData(payload.timeseries.cpu || []);
          setErrorData(payload.timeseries.errors || []);
        }

        // 3. Set Pre-Formatted OpenTelemetry Traces
        if (Array.isArray(payload.traces)) {
          setTraces(payload.traces);
        }

        // 4. Update Discovered Applications and Functions
        if (Array.isArray(payload.applications) && payload.applications.length > 0) {
          setApplications(payload.applications);
        }
      }
      setLastUpdated(new Date());
    } catch {
      // Backend offline; keep previous state
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedProject, selectedFunction, timeRange]);

  // Sync with ClickHouse on mount and when filter changes (Static - manual refresh only)
  React.useEffect(() => {
    fetchDatabaseTelemetry();
  }, [fetchDatabaseTelemetry]);

  const handleRefresh = React.useCallback(async () => {
    await fetchDatabaseTelemetry();
  }, [fetchDatabaseTelemetry]);

  return (
    <DashboardContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        selectedFunction,
        setSelectedFunction,
        applications,
        timeRange,
        setTimeRange,
        activeHeaderTab,
        setActiveHeaderTab,
        isLive,
        setIsLive,
        isRefreshing,
        lastUpdated,
        summary,
        requestData,
        responseTimeData,
        latencyData: responseTimeData, // alias
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

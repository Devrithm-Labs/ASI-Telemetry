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
import {
  getRequestData,
  getLatencyData,
  getCpuData,
  getErrorData,
  INITIAL_TRACES,
} from "./mock-data";

interface DashboardContextType {
  selectedProject: string;
  setSelectedProject: (proj: string) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  activeHeaderTab: "Monitoring" | "Dashboards" | "Alerts";
  setActiveHeaderTab: (tab: "Monitoring" | "Dashboards" | "Alerts") => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  requestData: RequestMetricPoint[];
  latencyData: LatencyMetricPoint[];
  cpuData: CpuMetricPoint[];
  errorData: ErrorMetricPoint[];
  handleRefresh: () => void;
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
  const [selectedProject, setSelectedProject] = React.useState("devrithm");
  const [timeRange, setTimeRange] = React.useState<TimeRange>("7d");
  const [activeHeaderTab, setActiveHeaderTab] = React.useState<
    "Monitoring" | "Dashboards" | "Alerts"
  >("Monitoring");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Modals state
  const [selectedTrace, setSelectedTrace] = React.useState<TraceRecord | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = React.useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = React.useState(false);

  // Live telemetry streaming simulation
  const [isLive, setIsLive] = React.useState(true);
  const [requestData, setRequestData] = React.useState<RequestMetricPoint[]>(() =>
    getRequestData("7d")
  );
  const [latencyData, setLatencyData] = React.useState<LatencyMetricPoint[]>(() =>
    getLatencyData("7d")
  );
  const [cpuData, setCpuData] = React.useState<CpuMetricPoint[]>(() =>
    getCpuData("7d")
  );
  const [errorData, setErrorData] = React.useState<ErrorMetricPoint[]>(() =>
    getErrorData("7d")
  );
  const [traces, setTraces] = React.useState<TraceRecord[]>(INITIAL_TRACES);

  const addTrace = React.useCallback((newTrace: TraceRecord) => {
    setTraces((prev) => [newTrace, ...prev]);
  }, []);

  // Update datasets when timeRange changes
  React.useEffect(() => {
    setRequestData(getRequestData(timeRange));
    setLatencyData(getLatencyData(timeRange));
    setCpuData(getCpuData(timeRange));
    setErrorData(getErrorData(timeRange));
  }, [timeRange]);

  // Live streaming ticker
  React.useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Fluctuate latest data point slightly
      setRequestData((prev) => {
        if (!prev.length) return prev;
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const last = copy[lastIdx]!;
        const deltaSuccess = Math.floor((Math.random() - 0.45) * 50);
        const newSuccess = Math.max(100, last.success + deltaSuccess);
        copy[lastIdx] = {
          ...last,
          success: newSuccess,
          total: newSuccess + last.failure,
        };
        return copy;
      });

      setCpuData((prev) => {
        if (!prev.length) return prev;
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const last = copy[lastIdx]!;
        const delta = Math.floor((Math.random() - 0.48) * 4);
        const newCpu = Math.min(95, Math.max(15, last.cpuPercent + delta));
        copy[lastIdx] = { ...last, cpuPercent: newCpu };
        return copy;
      });

      // Randomly spawn a fresh trace every few ticks
      if (Math.random() > 0.4) {
        const models = ["claude-3-5-sonnet", "gpt-4o", "gemini-1.5-pro", "text-embedding-3-large"];
        const operations = [
          "agent.planner.synthesize_plan",
          "rag.vector.semantic_search",
          "llm.stream_generation",
          "tool.sandbox.bash_exec",
          "db.telemetry.batch_flush",
        ];
        const randModel = models[Math.floor(Math.random() * models.length)]!;
        const randOp = operations[Math.floor(Math.random() * operations.length)]!;
        const isErr = Math.random() < 0.08;
        const isRate = !isErr && Math.random() < 0.05;
        const status = isErr ? "error" : isRate ? "rate_limited" : "success";
        const code = isErr ? 500 : isRate ? 429 : 200;
        const latency = Math.floor(Math.random() * (isErr ? 2500 : 350)) + 30;

        const now = new Date();
        const timeStr = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now
          .getDate()
          .toString()
          .padStart(2, "0")} ${now
          .getHours()
          .toString()
          .padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        const newTrace: TraceRecord = {
          id: `trc-${Math.random().toString(16).substring(2, 10)}`,
          name: randOp,
          service: "agent-runtime-core",
          status,
          statusCode: code,
          latencyMs: latency,
          cpuPercent: Math.floor(Math.random() * 40) + 15,
          tokens: Math.floor(Math.random() * 2400) + 200,
          model: randModel,
          timestamp: timeStr,
          spans: [
            { name: "context.retrieval", durationMs: Math.floor(latency * 0.2), status: "ok" },
            { name: "llm.stream_generation", durationMs: Math.floor(latency * 0.7), status: isErr ? "error" : "ok" },
            { name: "output.parse", durationMs: Math.floor(latency * 0.1), status: "ok" },
          ],
        };

        setTraces((prev) => [newTrace, ...prev.slice(0, 19)]);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isLive]);

  const handleRefresh = React.useCallback(() => {
    setRequestData(getRequestData(timeRange));
    setLatencyData(getLatencyData(timeRange));
    setCpuData(getCpuData(timeRange));
    setErrorData(getErrorData(timeRange));
  }, [timeRange]);

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

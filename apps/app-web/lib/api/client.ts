import {
  Trace,
  Agent,
  OverviewKPIs,
  TraceFilters,
} from "@/types/telemetry"
import { MOCK_TRACES, MOCK_AGENTS, MOCK_KPIS } from "./mock-data"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export class TelemetryApiClient {
  async getOverviewKPIs(): Promise<OverviewKPIs> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/overview/kpis`, { cache: "no-store" })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback to mock data if backend is offline
    }
    return MOCK_KPIS
  }


  async getTraces(filters?: TraceFilters): Promise<Trace[]> {
    await new Promise((resolve) => setTimeout(resolve, 80))
    let result = [...MOCK_TRACES]

    if (filters?.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.agentName.toLowerCase().includes(q)
      )
    }

    if (filters?.status && filters.status.length > 0) {
      result = result.filter((t) => filters.status!.includes(t.status))
    }

    if (filters?.agentId && filters.agentId.length > 0) {
      result = result.filter((t) => filters.agentId!.includes(t.agentId))
    }

    return result
  }

  async getTraceById(id: string): Promise<Trace | null> {
    await new Promise((resolve) => setTimeout(resolve, 60))
    return MOCK_TRACES.find((t) => t.id === id) || null
  }

  async getAgents(): Promise<Agent[]> {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return MOCK_AGENTS
  }
}

export const telemetryApi = new TelemetryApiClient()

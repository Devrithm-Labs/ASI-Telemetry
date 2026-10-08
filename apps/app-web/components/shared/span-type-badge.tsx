import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { SpanType } from "@/types/telemetry"
import {
  Sparkles,
  Wrench,
  Database,
  Bot,
  Workflow,
  ShieldCheck,
} from "lucide-react"

const CONFIG: Record<
  SpanType,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  llm: {
    label: "LLM",
    icon: Sparkles,
    className: "text-purple-500 border-purple-500/30 bg-purple-500/10",
  },
  tool: {
    label: "Tool",
    icon: Wrench,
    className: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  },
  retriever: {
    label: "Retriever",
    icon: Database,
    className: "text-cyan-500 border-cyan-500/30 bg-cyan-500/10",
  },
  agent: {
    label: "Agent",
    icon: Bot,
    className: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  },
  chain: {
    label: "Chain",
    icon: Workflow,
    className: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  },
  guardrail: {
    label: "Guardrail",
    icon: ShieldCheck,
    className: "text-rose-500 border-rose-500/30 bg-rose-500/10",
  },
}

export function SpanTypeBadge({ type }: { type: SpanType }) {
  const meta = CONFIG[type] || CONFIG.agent
  const Icon = meta.icon

  return (
    <Badge
      variant="outline"
      className={`h-5 px-1.5 text-[10px] font-mono gap-1 font-medium ${meta.className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{meta.label}</span>
    </Badge>
  )
}

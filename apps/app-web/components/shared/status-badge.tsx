import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { TraceStatus } from "@/types/telemetry"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export function StatusBadge({ status }: { status: TraceStatus }) {
  if (status === "ok") {
    return (
      <Badge
        variant="outline"
        className="h-5 px-1.5 text-[10px] font-mono gap-1 text-emerald-500 border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15"
      >
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        <span>ok</span>
      </Badge>
    )
  }

  if (status === "error") {
    return (
      <Badge
        variant="outline"
        className="h-5 px-1.5 text-[10px] font-mono gap-1 text-rose-500 border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/15"
      >
        <AlertCircle className="h-3 w-3 shrink-0" />
        <span>error</span>
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="h-5 px-1.5 text-[10px] font-mono gap-1 text-blue-500 border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/15"
    >
      <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
      <span>running</span>
    </Badge>
  )
}

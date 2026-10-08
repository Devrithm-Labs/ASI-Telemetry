import * as React from "react"

export default function TracesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Traces & Spans</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time OpenTelemetry trace streams and span execution trees.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
        Loading traces virtual table...
      </div>
    </div>
  )
}

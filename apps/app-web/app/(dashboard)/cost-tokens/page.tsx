import * as React from "react"

export default function CostTokensPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">LLM Cost & Token Usage</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Model spend tracking, token consumption rates, and cost attribution.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
        Cost & Token breakdown loading...
      </div>
    </div>
  )
}

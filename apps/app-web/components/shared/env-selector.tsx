"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function EnvSelector() {
  const [env, setEnv] = React.useState("production")

  return (
    <Select value={env} onValueChange={(val) => val && setEnv(val)}>
      <SelectTrigger size="sm" className="h-8 gap-2 text-xs font-mono font-medium">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              env === "production"
                ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                : env === "staging"
                ? "bg-amber-500 shadow-xs shadow-amber-500/50"
                : "bg-blue-500 shadow-xs shadow-blue-500/50"
            }`}
          />
          <SelectValue placeholder="Environment" />
        </span>
      </SelectTrigger>
      <SelectContent align="end" className="text-xs font-mono">
        <SelectItem value="production">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>production</span>
          </span>
        </SelectItem>
        <SelectItem value="staging">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>staging</span>
          </span>
        </SelectItem>
        <SelectItem value="development">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>development</span>
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

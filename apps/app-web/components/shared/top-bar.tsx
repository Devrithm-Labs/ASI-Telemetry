"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { CommandPalette } from "@/components/shared/command-palette"
import { DateRangePicker } from "@/components/shared/date-range-picker"
import { EnvSelector } from "@/components/shared/env-selector"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Badge } from "@/components/ui/badge"

const PAGE_TITLES: Record<string, string> = {
  "/overview": "Overview & Performance",
  "/traces": "Trace Explorer & Spans",
  "/cost-tokens": "LLM Cost & Token Burn",
  "/interactions": "Agent Interactions & Graph",
  "/health": "Uptime & Health SLOs",
  "/settings": "Workspace Settings",
}

export function TopBar() {
  const pathname = usePathname()
  const title = Object.entries(PAGE_TITLES).find(([route]) => pathname.startsWith(route))?.[1] || "Observability"

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tracking-tight">
            {title}
          </span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono text-emerald-500 border-emerald-500/30 bg-emerald-500/5 gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Ingestion
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <CommandPalette />
        <DateRangePicker />
        <EnvSelector />
        <Separator orientation="vertical" className="h-4 hidden sm:block" />
        <ThemeToggle />
      </div>
    </header>
  )
}

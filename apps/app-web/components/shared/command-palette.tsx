"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Activity,
  Layers,
  Coins,
  Cpu,
  HeartPulse,
  Settings,
  Sparkles,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-64 justify-between text-xs text-muted-foreground font-normal border-border/80 bg-background/50 backdrop-blur-xs"
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5" />
          <span>Search traces, agents, metrics...</span>
        </div>
        <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border/70 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search telemetry..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/overview"))}
              className="gap-2 cursor-pointer"
            >
              <Activity className="h-4 w-4 text-emerald-500" />
              <span>Overview & KPIs</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/traces"))}
              className="gap-2 cursor-pointer"
            >
              <Layers className="h-4 w-4 text-blue-500" />
              <span>Traces & Spans</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/cost-tokens"))}
              className="gap-2 cursor-pointer"
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <span>LLM Cost & Token Usage</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/interactions"))}
              className="gap-2 cursor-pointer"
            >
              <Cpu className="h-4 w-4 text-purple-500" />
              <span>Agent Interactions & Mesh</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/health"))}
              className="gap-2 cursor-pointer"
            >
              <HeartPulse className="h-4 w-4 text-rose-500" />
              <span>Uptime & Health</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Filters">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/traces?status=error"))}
              className="gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-rose-500" />
              <span>Filter Error Traces</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/traces?latency=slow"))}
              className="gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Filter Slow Spans (&gt;2000ms)</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/settings"))}
              className="gap-2 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Workspace Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

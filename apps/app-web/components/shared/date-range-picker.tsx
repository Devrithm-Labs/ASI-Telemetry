"use client"

import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format, subHours, subDays } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DatePreset = "1h" | "24h" | "7d" | "30d"

interface DateRangePickerProps {
  className?: string
  onRangeChange?: (range: { from: Date; to: Date; preset: DatePreset }) => void
}

export function DateRangePicker({ className, onRangeChange }: DateRangePickerProps) {
  const [preset, setPreset] = React.useState<DatePreset>("24h")
  const [open, setOpen] = React.useState(false)

  const getLabel = () => {
    switch (preset) {
      case "1h":
        return "Last 1 hour"
      case "24h":
        return "Last 24 hours"
      case "7d":
        return "Last 7 days"
      case "30d":
        return "Last 30 days"
    }
  }

  const handleSelect = (p: DatePreset) => {
    setPreset(p)
    setOpen(false)
    const now = new Date()
    let from = subHours(now, 24)
    if (p === "1h") from = subHours(now, 1)
    if (p === "24h") from = subHours(now, 24)
    if (p === "7d") from = subDays(now, 7)
    if (p === "30d") from = subDays(now, 30)

    onRangeChange?.({ from, to: now, preset: p })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start text-xs font-normal gap-2 border-border/80 bg-background/50 backdrop-blur-xs",
              className
            )}
          />
        }
      >
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">{getLabel()}</span>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5 text-xs" align="end">
        <div className="grid gap-1">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Quick Presets
          </div>
          {(
            [
              { id: "1h", label: "Last 1 hour", desc: "Real-time debugging" },
              { id: "24h", label: "Last 24 hours", desc: "Daily agent metrics" },
              { id: "7d", label: "Last 7 days", desc: "Weekly trends" },
              { id: "30d", label: "Last 30 days", desc: "Monthly spend & burn" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={cn(
                "flex flex-col items-start px-2 py-1.5 rounded-md text-left transition-colors hover:bg-accent",
                preset === item.id ? "bg-accent/80 font-medium" : "text-muted-foreground"
              )}
            >
              <span className="text-foreground text-xs">{item.label}</span>
              <span className="text-[10px] text-muted-foreground">{item.desc}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

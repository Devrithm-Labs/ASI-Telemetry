"use client"

import * as React from "react"
import { ChevronsUpDown, Check, Plus, Bot, Sparkles, Workflow } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export interface Project {
  id: string
  name: string
  environment: string
  icon: React.ComponentType<{ className?: string }>
}

const PROJECTS: Project[] = [
  {
    id: "proj_support",
    name: "Customer Support Agent",
    environment: "prod",
    icon: Bot,
  },
  {
    id: "proj_analyst",
    name: "Financial Data Synthesizer",
    environment: "prod",
    icon: Sparkles,
  },
  {
    id: "proj_dev",
    name: "Autonomous Coding Swarm",
    environment: "staging",
    icon: Workflow,
  },
]

export function ProjectSwitcher() {
  const [activeProject, setActiveProject] = React.useState<Project>(PROJECTS[0]!)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="w-full justify-between gap-2 px-2.5 h-10 hover:bg-accent/50 text-left font-normal"
          />
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <activeProject.icon className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left leading-tight truncate">
            <span className="truncate text-xs font-semibold text-foreground">
              {activeProject.name}
            </span>
            <span className="truncate text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
              {activeProject.environment} • ASI-Telemetry
            </span>
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 text-xs">
        <DropdownMenuLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Agent Workspaces
        </DropdownMenuLabel>
        {PROJECTS.map((project) => {
          const Icon = project.icon
          const isSelected = project.id === activeProject.id
          return (
            <DropdownMenuItem
              key={project.id}
              onClick={() => setActiveProject(project)}
              className="flex items-center justify-between py-1.5 cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">{project.name}</span>
              </div>
              {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-muted-foreground cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          <span>Register New Agent Service</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

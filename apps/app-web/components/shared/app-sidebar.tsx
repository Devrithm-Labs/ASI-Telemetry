"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Layers,
  Coins,
  Cpu,
  HeartPulse,
  Settings,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ProjectSwitcher } from "@/components/shared/project-switcher"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const NAV_ITEMS = [
  {
    title: "Overview",
    url: "/overview",
    icon: Activity,
    badge: "Live",
    description: "Core KPIs, Latency & Cost",
  },
  {
    title: "Traces",
    url: "/traces",
    icon: Layers,
    badge: "OTel",
    description: "Spans & Execution Waterfall",
  },
  {
    title: "LLM Cost & Tokens",
    url: "/cost-tokens",
    icon: Coins,
    description: "Spend by Model & Token Burn",
  },
  {
    title: "Interactions",
    url: "/interactions",
    icon: Cpu,
    description: "Agent Mesh & Tool Calls",
  },
  {
    title: "Uptime & Health",
    url: "/health",
    icon: HeartPulse,
    badge: "99.9%",
    description: "SLOs, Latency P95 & Errors",
  },
]

const SYSTEM_ITEMS = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-border/80 bg-sidebar" {...props}>
      <SidebarHeader className="p-2 border-b border-border/70">
        <ProjectSwitcher />
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
            Telemetry Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.url)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.url} />}
                      tooltip={item.title}
                      className="h-9 px-2.5 rounded-md font-medium text-xs transition-colors hover:bg-accent/70 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-data-[active=true]:text-primary" />
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground group-data-[active=true]:bg-primary/10 group-data-[active=true]:text-primary font-medium">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {SYSTEM_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.url)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.url} />}
                      tooltip={item.title}
                      className="h-9 px-2.5 rounded-md font-medium text-xs transition-colors hover:bg-accent/70 data-[active=true]:bg-accent"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/70">
        <div className="flex items-center gap-2.5 p-1 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors">
          <Avatar className="h-7 w-7 rounded-md">
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback className="rounded-md text-[10px] bg-primary text-primary-foreground font-semibold">
              UK
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left leading-tight truncate">
            <span className="truncate text-xs font-medium text-foreground">
              Engineering Team
            </span>
            <span className="truncate text-[10px] text-muted-foreground font-mono">
              admin@asi-telemetry.io
            </span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

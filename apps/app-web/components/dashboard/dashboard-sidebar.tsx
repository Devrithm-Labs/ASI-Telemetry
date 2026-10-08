"use client";

import * as React from "react";
import {
  Activity,
  Bot,
  Boxes,
  ChevronDown,
  Compass,
  Cpu,
  Database,
  FileCode,
  FolderGit2,
  Gauge,
  Home,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  PlaySquare,
  Search,
  Server,
  Settings,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isPlus?: boolean;
  hasSub?: boolean;
  active?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DashboardSidebar({
  activeNav = "Monitoring",
  onNavChange,
  collapsed = false,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const navigationGroups: NavGroup[] = [
    {
      group: "Application",
      items: [
        { label: "All applications", icon: Boxes, hasSub: true },
        { label: "Home", icon: Home },
      ],
    },
    {
      group: "Observability",
      items: [
        { label: "Tool Monitoring", icon: Gauge, active: true },
        { label: "LLM Monitoring", icon: Bot, active: true },
        { label: "Tracing", icon: Activity, badge: "1" },
      ],
    }
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-[#1e293b] bg-black text-slate-300 transition-all duration-300 ease-in-out shrink-0 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand & Workspace Switcher Header */}
      <div className="flex h-14 items-center justify-between border-b border-[#1e293b] px-3.5">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100 tracking-tight">
                <span className="font-extrabold text-xl">ASI-Telemetry</span>
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Activity className="h-4 w-4" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-[#171717] hover:text-slate-200 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Quick Search */}
      {!collapsed ? (
        <div className="px-3 pt-3 pb-1">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-[#1e293b] bg-black pl-8 pr-12 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="absolute right-2 flex items-center gap-0.5 rounded border border-[#1e293b] bg-[#111111] px-1 py-0.5 text-[9px] text-slate-400 font-mono">
              <span>Ctrl</span>
              <span>K</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center pt-3 pb-1">
          <button
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#1e293b] bg-black text-slate-400 hover:text-slate-200 hover:border-blue-500"
            title="Search (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Menu List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {navigationGroups.map((group, idx) => (
          <div key={idx} className="space-y-0.5">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.group}
              </div>
            )}
            {group.items.map((item, itemIdx) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;

              return (
                <button
                  key={itemIdx}
                  onClick={() => onNavChange?.(item.label)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                      : "text-slate-400 hover:bg-[#141414] hover:text-slate-200",
                    collapsed && "justify-center px-0 h-9 w-full"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-blue-400"
                    )}
                  />

                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>

                      {item.badge && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-900/60 px-1 text-[10px] text-blue-200">
                          {item.badge}
                        </span>
                      )}

                      {item.isPlus && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 border border-amber-500/20">
                          Plus
                        </span>
                      )}

                      {item.hasSub && (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / System Status & Settings */}
      <div className="border-t border-[#1e293b] p-2 space-y-1 bg-black">
        <button
          onClick={() => onNavChange?.("Settings")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 hover:bg-[#141414] hover:text-slate-200 transition-colors",
            activeNav === "Settings" && "bg-blue-600 text-white",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span>Settings</span>}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 border-t border-[#1e293b]/70 pt-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950 border border-blue-700/60 text-blue-300 font-bold text-xs">
              DL
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-medium text-slate-200 truncate">
                Devrithm Labs
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                admin@devrithm.io
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

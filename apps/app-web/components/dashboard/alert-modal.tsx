"use client";

import * as React from "react";
import { Bell, Check, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
}

export function AlertModal({ open, onClose }: AlertModalProps) {
  const [metric, setMetric] = React.useState("latency");
  const [threshold, setThreshold] = React.useState("300");
  const [operator, setOperator] = React.useState(">");
  const [saved, setSaved] = React.useState(false);

  if (!open) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl border border-[#1e293b] bg-black shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">Configure Telemetry Alert</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 font-medium">Metric Target</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#1e293b] bg-black px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="latency">Trace Latency (P99 ms)</option>
              <option value="error_rate">Trace Error Rate (%)</option>
              <option value="cpu_usage">Host CPU Core Usage (%)</option>
              <option value="rate_limit">HTTP 429 Rate Limit Surges</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-medium">Condition</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#1e293b] bg-black px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value=">">Greater than (&gt;)</option>
                <option value=">=">Greater than or equal (&gt;=)</option>
                <option value="<">Less than (&lt;)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 font-medium">Threshold Value</label>
              <input
                type="text"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#1e293b] bg-black px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-medium">Notification Channel</label>
            <input
              type="text"
              defaultValue="#ops-telemetry-alerts (Slack) + PagerDuty"
              className="mt-1 w-full rounded-md border border-[#1e293b] bg-black px-3 py-2 text-slate-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e293b]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Alert Created
              </>
            ) : (
              "Save Alert Rule"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

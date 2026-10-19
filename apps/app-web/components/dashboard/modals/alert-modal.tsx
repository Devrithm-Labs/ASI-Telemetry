"use client";

import * as React from "react";
import { Bell, Check, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
              <Bell className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Configure Telemetry Alert</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-muted-foreground font-medium">Metric Target</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            >
              <option value="latency">Trace Latency (P99 ms)</option>
              <option value="error_rate">Trace Error Rate (%)</option>
              <option value="rate_limit">HTTP 429 Rate Limit Surges</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground font-medium">Condition</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              >
                <option value=">">Greater than (&gt;)</option>
                <option value=">=">Greater than or equal (&gt;=)</option>
                <option value="<">Less than (&lt;)</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground font-medium">Threshold Value</label>
              <input
                type="text"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-muted-foreground font-medium">Notification Channel</label>
            <input
              type="text"
              defaultValue="#ops-telemetry-alerts (Slack) + PagerDuty"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="text-xs font-medium"
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Alert Created
              </>
            ) : (
              "Save Alert Policy"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

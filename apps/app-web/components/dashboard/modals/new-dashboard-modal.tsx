"use client";

import * as React from "react";
import { Check, LayoutDashboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewDashboardModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewDashboardModal({ open, onClose }: NewDashboardModalProps) {
  const [name, setName] = React.useState("Production Agent Fleet Telemetry");
  const [saved, setSaved] = React.useState(false);

  if (!open) return null;

  const handleCreate = () => {
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
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Create Custom Dashboard</h3>
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
            <label className="text-muted-foreground font-medium">Dashboard Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            />
          </div>

          <div>
            <label className="text-muted-foreground font-medium">Included Widget Sections</label>
            <div className="mt-2 space-y-2">
              {[
                "Request Volume & Throughput (Success vs Errors)",
                "Latency Percentiles (P50, P90, P99)",
                "Failure & HTTP Error Distribution",
                "Real-time Trace Spans Stream",
              ].map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-input bg-background text-primary focus:ring-ring"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
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
            onClick={handleCreate}
            className="text-xs font-medium"
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Created!
              </>
            ) : (
              "Create Dashboard"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

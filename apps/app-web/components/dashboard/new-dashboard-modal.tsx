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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl border border-[#1e293b] bg-black shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">Create Custom Dashboard</h3>
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
            <label className="text-slate-400 font-medium">Dashboard Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#1e293b] bg-black px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 font-medium">Included Widget Sections</label>
            <div className="mt-2 space-y-2">
              {[
                "Request Volume & Throughput (Success vs Errors)",
                "Latency Percentiles (P50, P90, P99)",
                "Failure & HTTP Error Distribution",
                "Node CPU & Memory Saturation",
                "Real-time Trace Spans Stream",
              ].map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-[#1e293b] bg-black text-blue-600 focus:ring-blue-500"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
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
            onClick={handleCreate}
            className="bg-blue-600 text-white hover:bg-blue-500"
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

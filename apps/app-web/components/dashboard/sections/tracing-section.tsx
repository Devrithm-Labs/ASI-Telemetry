"use client";

import * as React from "react";
import { TraceRecord } from "../context/dashboard-types";
import { TraceTable } from "../trace-table";

interface TracingSectionProps {
  traces: TraceRecord[];
  onSelectTrace: (trace: TraceRecord) => void;
  isLive?: boolean;
}

export function TracingSection({
  traces,
  onSelectTrace,
}: TracingSectionProps) {
  return (
    <div className="space-y-4">
      {/* Main Full-Width Trace Execution Logs Table */}
      <TraceTable
        traces={traces}
        onSelectTrace={onSelectTrace}
      />
    </div>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { QueryProvider } from "@/components/shared/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { DashboardLayoutShell } from "@/components/dashboard/layout/layout-shell";

export const metadata: Metadata = {
  title: "ASI-Telemetry | AI Observability & Monitoring",
  description:
    "OpenTelemetry observability platform: latency, requests, error analysis, CPU utilization, and trace execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-black" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-foreground antialiased selection:bg-blue-600/30 selection:text-blue-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <TooltipProvider>
              <NuqsAdapter>
                <DashboardLayoutShell>{children}</DashboardLayoutShell>
              </NuqsAdapter>
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

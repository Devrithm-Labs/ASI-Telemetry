"use client";

import { getBackendUrl } from "./api-config";
import { getAuthHeaders } from "./auth";

export interface AgentLinkTokenData {
  token: string;
  expires_in_seconds: number;
  expires_at: string;
  instruction: string;
}

export async function generateAgentLinkToken(): Promise<AgentLinkTokenData | null> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/auth/agent-link-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) {
      console.error("Failed to generate agent link token:", await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Error generating agent link token:", err);
    return null;
  }
}

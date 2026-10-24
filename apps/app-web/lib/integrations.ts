"use client";

import { BACKEND_URL } from "./api-config";
import { getAuthToken } from "./auth";

export interface GitHubIntegration {
  connected: boolean;
  github_username?: string | null;
  default_repository?: string | null;
  updated_at?: string | null;
}

export async function fetchGitHubIntegration(): Promise<GitHubIntegration> {
  const token = getAuthToken();
  if (!token) {
    return { connected: false };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/integrations/github`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return { connected: false };
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to fetch GitHub integration:", err);
    return { connected: false };
  }
}

export async function connectGitHubIntegration(payload: {
  accessToken: string;
  repository: string;
  username?: string;
}): Promise<GitHubIntegration> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("You must be logged in to connect a GitHub repository.");
  }

  const res = await fetch(`${BACKEND_URL}/api/integrations/github`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: payload.accessToken,
      default_repository: payload.repository,
      github_username: payload.username || "",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to connect repository" }));
    throw new Error(err.detail || "Failed to connect repository");
  }

  return await res.json();
}

export async function disconnectGitHubIntegration(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BACKEND_URL}/api/integrations/github`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return res.ok;
  } catch (err) {
    console.error("Failed to disconnect GitHub:", err);
    return false;
  }
}

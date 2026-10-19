"use client";

import { getAuthHeaders } from "./auth";

export type KeyEnvironment = "production" | "staging" | "development";

export type KeyPermission =
  | "telemetry:write"
  | "telemetry:read"
  | "alerts:manage"
  | "admin";

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string;
  environment: KeyEnvironment;
  permissions: KeyPermission[];
  createdAt: string;
  lastUsedAt: string | null;
  status: "active" | "revoked";
  rateLimit: string;
  expiresAt: string | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8080";

function mapBackendKeyToFrontend(raw: any): ApiKeyItem {
  let env: KeyEnvironment = "production";
  const rawEnv = (raw.environment || "").toLowerCase();
  if (rawEnv.includes("stag")) env = "staging";
  else if (rawEnv.includes("dev")) env = "development";

  return {
    id: raw.id || `key_${Date.now()}`,
    name: raw.name || "Default API Key",
    keyPrefix: raw.key_prefix || (raw.full_key ? `${raw.full_key.slice(0, 10)}••••••••` : "asi_live_••••••••"),
    fullKey: raw.full_key,
    environment: env,
    permissions: raw.permissions || ["telemetry:write", "telemetry:read"],
    createdAt: raw.created_at ? raw.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    lastUsedAt: raw.last_used_at ? raw.last_used_at.slice(0, 19).replace("T", " ") : "Never",
    status: raw.status === "revoked" ? "revoked" : "active",
    rateLimit: raw.rate_limit || "25,000 req/min",
    expiresAt: raw.expires_at || "90 days",
  };
}

/**
 * Fetches all API keys associated with the current user's session from backend ClickHouse.
 */
export async function fetchBackendApiKeys(): Promise<ApiKeyItem[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/api-keys`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map(mapBackendKeyToFrontend);
      }
    }
    return [];
  } catch (err) {
    console.warn("Could not fetch API keys from backend:", err);
    return [];
  }
}

/**
 * Creates a new API key in backend ClickHouse database for the user.
 */
export async function createBackendApiKey(
  name: string,
  environment: KeyEnvironment = "production",
  expiresAt: string = "90 days"
): Promise<{ success: boolean; key?: ApiKeyItem; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/api-keys`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        environment,
        expires_at: expiresAt,
        permissions: ["telemetry:write", "telemetry:read"],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || "Failed to create API key" };
    }

    return {
      success: true,
      key: mapBackendKeyToFrontend(data),
    };
  } catch (err: any) {
    console.error("Backend error creating API key:", err);
    return { success: false, error: "Unable to reach backend service to create API key." };
  }
}

/**
 * Revokes / Deletes an API key in ClickHouse database.
 */
export async function deleteBackendApiKey(keyId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/api-keys/${keyId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.warn("Could not revoke API key on backend:", err);
    return false;
  }
}

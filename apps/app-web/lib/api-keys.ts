"use client";

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

const STORAGE_KEY = "asi_telemetry_api_keys";

const INITIAL_KEYS: ApiKeyItem[] = [];

export function getStoredApiKeys(): ApiKeyItem[] {
  if (typeof window === "undefined") return INITIAL_KEYS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_KEYS));
      return INITIAL_KEYS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_KEYS;
  }
}

export function saveStoredApiKeys(keys: ApiKeyItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.error("Failed to save API keys to local storage:", err);
  }
}

export function generateRandomSecretKey(env: KeyEnvironment): string {
  const chars = "abcdef0123456789";
  let randomHex = "";
  for (let i = 0; i < 32; i++) {
    randomHex += chars[Math.floor(Math.random() * chars.length)];
  }
  const prefix = env === "production" ? "asi_live" : env === "staging" ? "asi_stage" : "asi_dev";
  return `${prefix}_${randomHex}`;
}

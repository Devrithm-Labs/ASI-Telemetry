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

const INITIAL_KEYS: ApiKeyItem[] = [
  {
    id: "key_prod_default",
    name: "Production Telemetry Agent",
    keyPrefix: "asi_live_7c82••••••••4f91",
    fullKey: "asi_live_7c82e5b4a9f14309a93f124801e9bb82",
    environment: "production",
    permissions: ["telemetry:write", "telemetry:read"],
    createdAt: "2026-09-12",
    lastUsedAt: "2 mins ago",
    status: "active",
    rateLimit: "50,000 req/min",
    expiresAt: "Never",
  },
  {
    id: "key_stage_worker",
    name: "Staging SDK Collector",
    keyPrefix: "asi_stage_3b11••••••••99a0",
    fullKey: "asi_stage_3b11294fd9a4411fb20a48b1081a99a0",
    environment: "staging",
    permissions: ["telemetry:write"],
    createdAt: "2026-10-01",
    lastUsedAt: "1 hour ago",
    status: "active",
    rateLimit: "10,000 req/min",
    expiresAt: "90 days",
  },
  {
    id: "key_dev_local",
    name: "Local Dev CLI & Tracing",
    keyPrefix: "asi_dev_88fa••••••••12c4",
    fullKey: "asi_dev_88fa5389ce214a1db89cf009210e12c4",
    environment: "development",
    permissions: ["telemetry:write", "telemetry:read", "alerts:manage"],
    createdAt: "2026-10-14",
    lastUsedAt: "Yesterday",
    status: "active",
    rateLimit: "5,000 req/min",
    expiresAt: "30 days",
  },
];

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

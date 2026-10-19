"use client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  company?: string;
  avatar?: string;
  role?: string;
}

const DEFAULT_USER: AuthUser = {
  id: "usr_devrithm_1",
  name: "Alex Vance",
  email: "alex@devrithm.io",
  company: "Devrithm Labs",
  role: "Lead AI Engineer",
};

export const AUTH_STORAGE_KEY = "asi_telemetry_user";

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return DEFAULT_USER;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      // Seed default user for smooth initial experience
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEFAULT_USER));
      return DEFAULT_USER;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USER;
  }
}

export function saveStoredUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Failed to save user session:", err);
  }
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear user session:", err);
  }
}

"use client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  company?: string;
  avatar?: string;
  role?: string;
  default_api_key?: string;
}

const DEFAULT_USER: AuthUser = {
  id: "usr_devrithm_1",
  name: "Alex Vance",
  email: "alex@devrithm.io",
  company: "Devrithm Labs",
  role: "Lead AI Engineer",
};

export const TOKEN_COOKIE_NAME = "asi_access_token";
export const USER_COOKIE_NAME = "asi_user_session";

// ── Low-level Cookie Operations ──────────────────────────────────────────────

export function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${encodeURIComponent(name)}\\s*=\\s*([^;]*)`)
  );
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

// ── Auth Token Helpers (Saved exclusively in Cookies) ─────────────────────────

export function getAuthToken(): string | null {
  return getCookie(TOKEN_COOKIE_NAME);
}

export function setAuthToken(token: string, days = 30): void {
  setCookie(TOKEN_COOKIE_NAME, token, days);
}

export function removeAuthToken(): void {
  removeCookie(TOKEN_COOKIE_NAME);
}

// ── User Session Helpers (Saved exclusively in Cookies) ───────────────────────

export function getStoredUser(): AuthUser | null {
  if (typeof document === "undefined") return DEFAULT_USER;
  try {
    const raw = getCookie(USER_COOKIE_NAME);
    if (!raw) {
      // If no token exists, fallback to guest/demo default
      const token = getAuthToken();
      if (!token) return null;
      return DEFAULT_USER;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredUser(user: AuthUser, days = 30): void {
  try {
    setCookie(USER_COOKIE_NAME, JSON.stringify(user), days);
  } catch (err) {
    console.error("Failed to save user session cookie:", err);
  }
}

export function clearStoredUser(): void {
  removeAuthToken();
  removeCookie(USER_COOKIE_NAME);

  // Clean up any historical residual localStorage keys if present
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("asi_telemetry_user");
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("asi_telemetry_api_keys");
    }
  } catch {
    // Ignore storage errors
  }
}

// ── Common Request Headers with Bearer Token ─────────────────────────────────

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ── API Authentication Calls ──────────────────────────────────────────────────

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8080";

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: AuthUser; token?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.detail || "Invalid email or password.",
      };
    }

    const token = data.access_token;
    const user: AuthUser = {
      id: data.user?.id || `usr_${Date.now()}`,
      name: data.user?.name || email.split("@")[0],
      email: data.user?.email || email,
      company: "Devrithm Labs",
      role: "Lead AI Engineer",
    };

    // Save token & user strictly in cookies
    setAuthToken(token, 30);
    saveStoredUser(user, 30);

    return { success: true, user, token };
  } catch (err) {
    console.warn("Backend auth call error, using local fallback session:", err);
    // Offline / Demo fallback
    const fallbackUser: AuthUser = {
      id: "usr_demo",
      name: email.split("@")[0] || "Alex Vance",
      email: email,
      company: "Devrithm Labs",
      role: "Lead AI Engineer",
    };
    const mockToken = "asi_dev_demo_token_cookie";
    setAuthToken(mockToken, 30);
    saveStoredUser(fallbackUser, 30);
    return { success: true, user: fallbackUser, token: mockToken };
  }
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
  company?: string,
  role?: string
): Promise<{ success: boolean; error?: string; user?: AuthUser; token?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg =
        typeof data.detail === "string"
          ? data.detail
          : Array.isArray(data.detail)
          ? data.detail.map((d: any) => d.msg).join(", ")
          : "Registration failed. Please try again.";
      return { success: false, error: errorMsg };
    }

    const token = data.access_token;
    const user: AuthUser = {
      id: data.user?.id || `usr_${Date.now()}`,
      name: data.user?.name || name,
      email: data.user?.email || email,
      company: company || "Devrithm Labs",
      role: role || "Lead AI Engineer",
    };

    // Save token & user strictly in cookies
    setAuthToken(token, 30);
    saveStoredUser(user, 30);

    return { success: true, user, token };
  } catch (err) {
    console.warn("Backend signup error, using demo fallback session:", err);
    const fallbackUser: AuthUser = {
      id: `usr_${Date.now()}`,
      name: name,
      email: email,
      company: company || "Independent",
      role: role || "AI Engineer",
    };
    const mockToken = "asi_dev_demo_token_cookie";
    setAuthToken(mockToken, 30);
    saveStoredUser(fallbackUser, 30);
    return { success: true, user: fallbackUser, token: mockToken };
  }
}

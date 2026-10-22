/**
 * Dedicated backend URL configuration.
 *
 * Configurable via:
 * 1. `NEXT_PUBLIC_BACKEND_URL` - Explicit public backend URL (e.g. https://api.yourdomain.com or http://127.0.0.1:8080)
 * 2. `BACKEND_URL` - Internal server/service binding URL for server-side fetches
 * 3. Default fallback: http://127.0.0.1:8080
 */
export function getBackendUrl(): string {
  // 1. Explicit public backend URL (available to both client-side and server-side code)
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }

  // 2. Server-side service binding (for internal Vercel services or private networking)
  if (typeof window === "undefined" && process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, "");
  }

  // 3. Fallback to local/standalone backend URL
  return "http://127.0.0.1:8080";
}

export const BACKEND_URL = getBackendUrl();

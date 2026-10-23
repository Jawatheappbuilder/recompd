import { supabase } from "@/integrations/supabase/client";
import { LOVABLE_ORIGIN, accountApiOrigin } from "@/lib/account-api";
import { dailySummarySchema, type DailySummaryInput, type HealthSummary } from "@/lib/health-sync";

/** The URL the Apple Shortcut posts to. Always the Lovable-hosted backend, which holds the secure keys. */
const EDGE_BASE = import.meta.env.VITE_APPLE_HEALTH_EDGE_URL?.trim().replace(/\\/$/, "") ?? "";
const USE_EDGE = /^https:\\/\\/[^/]+\\/functions\\/v1\\/apple-health-sync$/.test(EDGE_BASE);
export const SHORTCUT_ENDPOINT = USE_EDGE ? `${EDGE_BASE}/daily` : `${LOVABLE_ORIGIN}/api/public/health/daily`;

export const isIPhone = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return token;
}

/** Prefer the published Lovable Cloud host; retry the project host only for transport/route failures. */
const PUBLISHED_LOVABLE_ORIGIN = "https://recompd.lovable.app";
const healthOrigins = () => Array.from(new Set([PUBLISHED_LOVABLE_ORIGIN, accountApiOrigin(), LOVABLE_ORIGIN]));

async function call(path: string, method: "POST" | "DELETE", body?: unknown) {
  const authorization = `Bearer ${await accessToken()}`;
  if (USE_EDGE && (path.endsWith("/token") || path.endsWith("/daily"))) {
    const response = await fetch(`${EDGE_BASE}${path.endsWith("/token") ? "/token" : "/daily"}`, {
      method, headers: { Authorization: authorization, ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Apple Health Edge Function (${response.status})`);
    return response.json() as Promise<Record<string, unknown>>;
  }
  const headers = { Authorization: authorization, ...(body ? { "content-type": "application/json" } : {}) };
  let lastError: Error | null = null;
  for (const [index, origin] of healthOrigins().entries()) {
    try {
      const response = await fetch(`${origin}${path}`, {
        method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 404 && index < healthOrigins().length - 1) continue;
      if (!response.ok) {
        let detail = "";
        try {
          const payload = await response.json() as Record<string, unknown>;
          detail = String(payload["error"] ?? payload["message"] ?? "").slice(0, 140);
        } catch { /* No JSON error body */ }
        throw new Error(`Health connection failed (${response.status})${detail ? `: ${detail}` : ""}`);
      }
      return response.json() as Promise<Record<string, unknown>>;
    } catch (error) {
      if (error instanceof TypeError && index < healthOrigins().length - 1) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error("Apple Health API endpoint is unavailable.");
}

/** Returns the new token. Keep it only in component memory; never persist it. */
export async function createSyncToken(): Promise<string> {
  const result = await call("/api/public/health/token", "POST");
  return String(result["token"]);
}

export async function revokeSyncToken(): Promise<void> {
  await call("/api/public/health/token", "DELETE");
}

export type TokenStatus = { created_at: string; last_used_at: string | null } | null;

export async function fetchTokenStatus(): Promise<TokenStatus> {
  const { data, error } = await supabase.from("health_sync_tokens").select("created_at, last_used_at").maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchHealthHistory(days = 14): Promise<HealthSummary[]> {
  const { data, error } = await supabase
    .from("health_daily_summaries")
    .select("day, steps, active_kcal, resting_hr, average_hr, received_at, source")
    .order("day", { ascending: false })
    .limit(days);
  if (error) throw error;
  return data ?? [];
}

// ---- Earlier on-device prototype data (consented migration only) ----

type LocalFind = { keys: string[]; days: DailySummaryInput[] };

/** Looks for summaries the earlier JSON-import prototype kept in this browser. */
export function findLocalPrototypeData(): LocalFind {
  const found: LocalFind = { keys: [], days: [] };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !/apple[-_]?health/i.test(key)) continue;
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      const list = Array.isArray(value) ? value : value && typeof value === "object" ? (Object.values(value).find(Array.isArray) as unknown[] | undefined) ?? [] : [];
      let matched = false;
      for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        const parsed = dailySummarySchema.safeParse({
          date: row["date"] ?? row["day"],
          steps: row["steps"],
          ...(row["activeKcal"] ?? row["activeEnergy"] ?? row["activeCalories"] ? { activeKcal: row["activeKcal"] ?? row["activeEnergy"] ?? row["activeCalories"] } : {}),
          ...(row["restingHr"] ?? row["restingHeartRate"] ? { restingHr: row["restingHr"] ?? row["restingHeartRate"] } : {}),
          ...(row["averageHr"] ?? row["heartRate"] ?? row["averageHeartRate"] ? { averageHr: row["averageHr"] ?? row["heartRate"] ?? row["averageHeartRate"] } : {}),
        });
        if (parsed.success) { found.days.push(parsed.data); matched = true; }
      }
      if (matched) found.keys.push(key);
    }
  } catch { /* unreadable storage: nothing to migrate */ }
  return found;
}

export async function importLocalPrototypeData(found: LocalFind): Promise<number> {
  const result = await call("/api/public/health/import", "POST", { days: found.days });
  for (const key of found.keys) localStorage.removeItem(key);
  return Number(result["imported"] ?? 0);
}

/** Non-mutating connectivity probes. Never send auth credentials or tokens to diagnostics endpoints. */
export type HealthProbe = { label: string; host: string; status: string; detail: string };
export async function diagnoseAppleHealth(): Promise<HealthProbe[]> {
  const path = "/api/public/health/token";
  const hosts = Array.from(new Set([window.location.origin, PUBLISHED_LOVABLE_ORIGIN, LOVABLE_ORIGIN]));
  const results: HealthProbe[] = [];
  for (const origin of hosts) {
    const label = origin === window.location.origin ? "Current app" : origin === PUBLISHED_LOVABLE_ORIGIN ? "Published Lovable" : "Lovable project";
    try {
      // OPTIONS is read-only. It can identify a missing route or a cross-origin block
      // without creating/replacing a sync token.
      const response = await fetch(origin + path, { method: "OPTIONS", mode: "cors", cache: "no-store", redirect: "manual" });
      const detail = response.type === "opaqueredirect" ? "Redirect detected" :
        response.status === 204 ? "Preflight accepted" :
        response.status === 404 ? "API route not found" :
        response.status === 500 ? "Backend returned 500" :
        "HTTP " + response.status;
      results.push({ label, host: new URL(origin).hostname, status: response.ok ? "reachable" : "issue", detail });
    } catch {
      // Browsers do not expose whether a fetch TypeError was caused by CORS,
      // DNS, TLS, a redirect, or loss of connectivity.
      results.push({ label, host: new URL(origin).hostname, status: "blocked", detail: "Browser blocked the request or the server was unreachable (possible CORS/redirect)" });
    }
  }
  return results;
}

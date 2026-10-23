import { supabase } from "@/integrations/supabase/client";
import { LOVABLE_ORIGIN, accountApiOrigin } from "@/lib/account-api";
import { dailySummarySchema, type DailySummaryInput, type HealthSummary } from "@/lib/health-sync";

/** The URL the Apple Shortcut posts to. Always the Lovable-hosted backend, which holds the secure keys. */
export const SHORTCUT_ENDPOINT = `${LOVABLE_ORIGIN}/api/public/health/daily`;

export const isIPhone = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return token;
}

async function call(path: string, method: "POST" | "DELETE", body?: unknown) {
  const response = await fetch(`${accountApiOrigin()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    let detail = "";
    try { const payload = await response.json() as Record<string, unknown>; detail = String(payload["error"] ?? payload["message"] ?? "").slice(0, 140); } catch { /* No JSON error body */ }
    throw new Error(`Health connection failed (${response.status})${detail ? `: ${detail}` : ""}`);\n  }
  return response.json() as Promise<Record<string, unknown>>;
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

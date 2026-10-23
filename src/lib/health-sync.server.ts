import { RATE_LIMIT_PER_HOUR, SYNC_TOKEN_PREFIX, type DailySummaryInput } from "@/lib/health-sync";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return SYNC_TOKEN_PREFIX + b64;
}

/** Creates (or replaces) the user's sync token. The plain token is returned once and never stored. */
export async function issueSyncToken(userId: string): Promise<{ token: string; createdAt: string }> {
  const token = randomToken();
  const createdAt = new Date().toISOString();
  const db = await admin();
  const { error } = await db.from("health_sync_tokens").upsert(
    { user_id: userId, token_hash: await sha256Hex(token), created_at: createdAt, last_used_at: null, window_start: createdAt, window_count: 0 },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`issue token: ${error.message}`);
  return { token, createdAt };
}

export async function revokeSyncToken(userId: string): Promise<void> {
  const db = await admin();
  const { error } = await db.from("health_sync_tokens").delete().eq("user_id", userId);
  if (error) throw new Error(`revoke token: ${error.message}`);
}

export type TokenCheck = { ok: true; userId: string } | { ok: false; status: 401 | 429 };

/** Resolves a sync token to its user and applies a per-token hourly limit. */
export async function authorizeSyncToken(authHeader: string | null): Promise<TokenCheck> {
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401 };
  const token = authHeader.slice(7).trim();
  if (!token.startsWith(SYNC_TOKEN_PREFIX) || token.length < 40 || token.length > 80) return { ok: false, status: 401 };
  const db = await admin();
  const { data, error } = await db.from("health_sync_tokens").select("user_id, window_start, window_count").eq("token_hash", await sha256Hex(token)).maybeSingle();
  if (error) throw new Error(`token lookup: ${error.message}`);
  if (!data) return { ok: false, status: 401 };
  const now = Date.now();
  const fresh = now - Date.parse(data.window_start) > 3_600_000;
  const count = fresh ? 1 : data.window_count + 1;
  await db.from("health_sync_tokens").update({
    window_start: fresh ? new Date(now).toISOString() : data.window_start,
    window_count: count,
    ...(count <= RATE_LIMIT_PER_HOUR ? { last_used_at: new Date(now).toISOString() } : {}),
  }).eq("user_id", data.user_id);
  if (count > RATE_LIMIT_PER_HOUR) return { ok: false, status: 429 };
  return { ok: true, userId: data.user_id };
}

export async function upsertSummaries(userId: string, rows: DailySummaryInput[], source: "apple_shortcuts" | "local_import"): Promise<void> {
  if (rows.length === 0) return;
  const db = await admin();
  const { error } = await db.from("health_daily_summaries").upsert(
    rows.map((row) => ({
      user_id: userId,
      day: row.date,
      steps: row.steps,
      active_kcal: row.activeKcal ?? null,
      resting_hr: row.restingHr ?? null,
      average_hr: row.averageHr ?? null,
      source,
      received_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,day" },
  );
  if (error) throw new Error(`upsert summaries: ${error.message}`);
}

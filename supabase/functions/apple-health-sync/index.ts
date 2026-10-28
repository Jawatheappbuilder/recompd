// Deploy to Lovable Cloud / Supabase Edge Functions as "apple-health-sync".
// Runtime secrets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be injected by
// the cloud provider. NEVER place service keys in Vite variables or the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allow = new Set(["https://recompd.vercel.app", "https://recompd.lovable.app"]);
const prefix = "rcmp_hs_";
const encoder = new TextEncoder();
const json = (value: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(value), { status, headers: {
    "content-type": "application/json", "cache-control": "no-store",
    ...(allow.has(origin) ? { "access-control-allow-origin": origin, "vary": "Origin" } : {}),
  } });
const cors = (origin: string) => ({
  ...(allow.has(origin) ? { "access-control-allow-origin": origin, "vary": "Origin" } : {}),
  "access-control-allow-methods": "POST, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-max-age": "600",
});
async function digest(value: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(d, v => v.toString(16).padStart(2, "0")).join("");
}
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return prefix + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function boundedInt(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}
Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (origin && !allow.has(origin)) return json({ error: "Origin not allowed" }, 403);
  const url = new URL(request.url);
  const route = url.pathname.endsWith("/token") ? "token" : url.pathname.endsWith("/daily") ? "daily" : "";
  if (!route || (request.method !== "POST" && request.method !== "DELETE") || (route === "daily" && request.method !== "POST"))
    return json({ error: "Not found" }, 404, origin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Backend not configured" }, 503, origin);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, origin);
  const supplied = header.slice(7).trim();
  try {
    if (route === "token") {
      // User JWT verified by Supabase Auth; never trust a user ID supplied by client.
      const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await auth.auth.getUser(supplied);
      if (error || !data.user) return json({ error: "Unauthorized" }, 401, origin);
      const userId = data.user.id;
      if (request.method === "DELETE") {
        const { error: e } = await admin.from("health_sync_tokens").delete().eq("user_id", userId);
        return e ? json({ error: "Database unavailable" }, 503, origin) : json({ ok: true }, 200, origin);
      }
      const token = newToken();
      const now = new Date().toISOString();
      const { error: e } = await admin.from("health_sync_tokens").upsert({
        user_id: userId, token_hash: await digest(token), created_at: now,
        last_used_at: null, window_start: now, window_count: 0,
      }, { onConflict: "user_id" });
      return e ? json({ error: "Database unavailable" }, 503, origin) : json({ token, createdAt: now }, 200, origin);
    }
    if (!supplied.startsWith(prefix) || supplied.length < 40 || supplied.length > 80)
      return json({ error: "Unauthorized" }, 401, origin);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 4096) return json({ error: "Too large" }, 413, origin);
    const bodyText = await request.text();
    if (bodyText.length > 4096) return json({ error: "Too large" }, 413, origin);
    let body: Record<string, unknown>;
    try { body = JSON.parse(bodyText); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid data" }, 400, origin);
    const date = body.date;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + "T00:00:00Z")))
      return json({ error: "Invalid date" }, 400, origin);
    const delta = Math.abs(Date.now() - Date.parse(date + "T00:00:00Z"));
    if (delta > 32 * 86400000) return json({ error: "Date out of range" }, 400, origin);
    if (!boundedInt(body.steps, 0, 200000) ||
       (body.activeKcal != null && !boundedInt(body.activeKcal, 0, 20000)) ||
       (body.restingHr != null && !boundedInt(body.restingHr, 20, 250)) ||
       (body.averageHr != null && !boundedInt(body.averageHr, 20, 250)))
      return json({ error: "Invalid metrics" }, 400, origin);
    const { data: saved, error: lookupError } = await admin.from("health_sync_tokens")
      .select("user_id,window_start,window_count").eq("token_hash", await digest(supplied)).maybeSingle();
    if (lookupError) return json({ error: "Database unavailable" }, 503, origin);
    if (!saved) return json({ error: "Unauthorized" }, 401, origin);
    const now = new Date();
    const refreshed = now.getTime() - Date.parse(saved.window_start) > 3600000;
    const count = refreshed ? 1 : saved.window_count + 1;
    if (count > 30) return json({ error: "Rate limit reached" }, 429, origin);
    const { error: writeError } = await admin.from("health_daily_summaries").upsert({
      user_id: saved.user_id, day: date, steps: body.steps,
      active_kcal: body.activeKcal ?? null, resting_hr: body.restingHr ?? null,
      average_hr: body.averageHr ?? null, source: "apple_shortcuts", received_at: now.toISOString(),
    }, { onConflict: "user_id,day" });
    if (writeError) return json({ error: "Save failed" }, 503, origin);
    await admin.from("health_sync_tokens").update({
      window_start: refreshed ? now.toISOString() : saved.window_start,
      window_count: count, last_used_at: now.toISOString(),
    }).eq("user_id", saved.user_id);
    return json({ ok: true, date }, 200, origin);
  } catch (error) {
    console.error("apple-health-sync:", error instanceof Error ? error.message : "unexpected");
    return json({ error: "Server unavailable" }, 503, origin);
  }
});

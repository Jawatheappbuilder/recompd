import { createFileRoute } from "@tanstack/react-router";
import { MAX_BODY_BYTES, dailySummarySchema, isDateInWindow } from "@/lib/health-sync";
import { authorizeSyncToken, upsertSummaries } from "@/lib/health-sync.server";

// Called by the user's Apple Shortcut. Auth is the per-user sync token in the
// Authorization header; it can only write that user's daily summary.
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const Route = createFileRoute("/api/public/health/daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const length = Number(request.headers.get("content-length") ?? 0);
        if (length > MAX_BODY_BYTES) return reply(413, { error: "Request too large" });
        let auth;
        try {
          auth = await authorizeSyncToken(request.headers.get("authorization"));
        } catch (err) {
          console.error("health-daily: token check failed", err instanceof Error ? err.message : "unknown");
          return reply(500, { error: "Sync is unavailable right now" });
        }
        if (!auth.ok) return reply(auth.status, { error: auth.status === 429 ? "Too many syncs, try again later" : "Invalid or revoked sync token" });

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) return reply(413, { error: "Request too large" });
        let body: unknown;
        try { body = JSON.parse(raw); } catch { return reply(400, { error: "Body must be JSON" }); }
        const parsed = dailySummarySchema.safeParse(body);
        if (!parsed.success) return reply(400, { error: "Invalid summary", fields: parsed.error.issues.map((i) => i.path.join(".") || "body") });
        if (!isDateInWindow(parsed.data.date)) return reply(400, { error: "Date is outside the allowed range" });

        try {
          await upsertSummaries(auth.userId, [parsed.data], "apple_shortcuts");
        } catch (err) {
          console.error("health-daily: save failed", err instanceof Error ? err.message : "unknown");
          return reply(500, { error: "Could not save summary" });
        }
        return reply(200, { ok: true, date: parsed.data.date, steps: parsed.data.steps });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyAccessToken } from "@/lib/account.server";
import { corsHeaders, json } from "@/lib/api-cors";
import { dailySummarySchema, isRealDate } from "@/lib/health-sync";
import { upsertSummaries } from "@/lib/health-sync.server";

// One-off, user-consented import of summaries saved on-device by the earlier prototype.
const bodySchema = z.object({ days: z.array(dailySummarySchema).min(1).max(366) }).strict();

export const Route = createFileRoute("/api/public/health/import")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        let userId: string | null;
        try { userId = await verifyAccessToken(request.headers.get("authorization")); }
        catch { return json(request, 500, { error: "Unavailable" }); }
        if (!userId) return json(request, 401, { error: "Unauthorized" });
        const raw = await request.text();
        if (raw.length > 64_000) return json(request, 413, { error: "Too large" });
        let parsed;
        try { parsed = bodySchema.safeParse(JSON.parse(raw)); } catch { return json(request, 400, { error: "Body must be JSON" }); }
        if (!parsed.success) return json(request, 400, { error: "Invalid data" });
        const days = parsed.data.days.filter((d) => isRealDate(d.date));
        try { await upsertSummaries(userId, days, "local_import"); }
        catch (err) { console.error("health-import failed", err instanceof Error ? err.message : "unknown"); return json(request, 500, { error: "Import failed" }); }
        return json(request, 200, { ok: true, imported: days.length });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { verifyAccessToken } from "@/lib/account.server";
import { corsHeaders, json } from "@/lib/api-cors";
import { issueSyncToken, revokeSyncToken } from "@/lib/health-sync.server";

const METHODS = "POST, DELETE, OPTIONS";

async function signedInUser(request: Request): Promise<string | null | "error"> {
  try { return await verifyAccessToken(request.headers.get("authorization")); }
  catch (err) { console.error("health-token: verify failed", err instanceof Error ? err.message : "unknown"); return "error"; }
}

export const Route = createFileRoute("/api/public/health/token")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request, METHODS) }),
      POST: async ({ request }) => {
        const userId = await signedInUser(request);
        if (userId === "error") return json(request, 500, { error: "Unavailable" }, METHODS);
        if (!userId) return json(request, 401, { error: "Unauthorized" }, METHODS);
        try {
          const issued = await issueSyncToken(userId);
          return json(request, 200, issued, METHODS);
        } catch (err) {
          console.error("health-token: issue failed", err instanceof Error ? err.message : "unknown");
          return json(request, 500, { error: "Could not create token" }, METHODS);
        }
      },
      DELETE: async ({ request }) => {
        const userId = await signedInUser(request);
        if (userId === "error") return json(request, 500, { error: "Unavailable" }, METHODS);
        if (!userId) return json(request, 401, { error: "Unauthorized" }, METHODS);
        try { await revokeSyncToken(userId); } catch (err) {
          console.error("health-token: revoke failed", err instanceof Error ? err.message : "unknown");
          return json(request, 500, { error: "Could not revoke token" }, METHODS);
        }
        return json(request, 200, { ok: true }, METHODS);
      },
    },
  },
});

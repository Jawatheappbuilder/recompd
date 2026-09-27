import { createFileRoute } from "@tanstack/react-router";
import { deleteUserAccount, verifyAccessToken } from "@/lib/account.server";

// The app is also served from Vercel (web + Android shell), which has no access to the
// backend's service-role key, so those clients call this Lovable-hosted endpoint directly.
const ALLOWED_ORIGINS = new Set([
  "https://recompd.vercel.app",
  "https://recompd.lovable.app",
  "https://project--465a9460-5ace-5d8a-90ae-2e52ab14dc35.lovable.app",
  "https://project--465a9460-5ace-5d8a-90ae-2e52ab14dc35-dev.lovable.app",
  "https://id-preview--465a9460-5ace-5d8a-90ae-2e52ab14dc35.lovable.app",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost:8080",
]);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin", "Cache-Control": "no-store" };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "authorization, content-type";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

function json(request: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/account/delete")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        let userId: string | null;
        try {
          // Identity comes only from the verified bearer token, never from the request body.
          userId = await verifyAccessToken(request.headers.get("authorization"));
        } catch (err) {
          console.error("delete-account: token verification failed", err);
          return json(request, 500, { error: "Account deletion is unavailable." });
        }
        if (!userId) return json(request, 401, { error: "Unauthorized" });
        try {
          await deleteUserAccount(userId);
        } catch (err) {
          console.error("delete-account failed", err);
          return json(request, 500, { error: "Account deletion failed." });
        }
        return json(request, 200, { success: true });
      },
    },
  },
});

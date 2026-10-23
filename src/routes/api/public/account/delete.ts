import { createFileRoute } from "@tanstack/react-router";
import { deleteUserAccount, verifyAccessToken } from "@/lib/account.server";
import { corsHeaders, json } from "@/lib/api-cors";


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

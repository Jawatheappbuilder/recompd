// Origins allowed to call Lovable-hosted /api/public endpoints from a browser.
// The app is also served from Vercel (web + Android shell), which has no access to the
// backend's service-role key, so those clients call Lovable-hosted endpoints cross-origin.
export const ALLOWED_ORIGINS = new Set([
  "https://recompd.vercel.app",
  "https://recompd.lovable.app",
  "https://project--465a9460-5ace-5d8a-90ae-2e52ab14dc35.lovable.app",
  "https://project--465a9460-5ace-5d8a-90ae-2e52ab14dc35-dev.lovable.app",
  "https://id-preview--465a9460-5ace-5d8a-90ae-2e52ab14dc35.lovable.app",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost:8080",
]);

export function corsHeaders(request: Request, methods = "POST, OPTIONS"): Record<string, string> {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin", "Cache-Control": "no-store" };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = methods;
    headers["Access-Control-Allow-Headers"] = "authorization, content-type";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

export function json(request: Request, status: number, body: unknown, methods?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request, methods), "content-type": "application/json" },
  });
}

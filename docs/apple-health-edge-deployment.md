# Apple Health via Lovable Cloud Edge Function (not activated)

This branch prepares a Supabase-compatible Edge Function at
`supabase/functions/apple-health-sync/index.ts` with two routes:

- `POST /functions/v1/apple-health-sync/token` authenticates the logged-in user JWT and returns a one-time restricted Shortcut token. `DELETE` revokes it.
- `POST /functions/v1/apple-health-sync/daily` accepts the restricted Shortcut token and validates/writes daily metrics to Lovable Cloud.

## Deployment prerequisites

**GitHub commits and Vercel builds do not deploy Lovable Cloud Edge Functions.**
An administrator must deploy the function to the *existing* Lovable Cloud Supabase project through Lovable's Edge Functions deployment workflow (or an authorized Supabase CLI session). Do not assume a repository file creates the running function.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` must be supplied securely by the Lovable Cloud Edge runtime, not exposed in browser config.
- `verify_jwt = false` in Supabase function config because Apple Shortcuts uses a restricted sync token; the function independently verifies account JWT for token management.
- Perform an OPTIONS preflight test from `https://recompd.vercel.app` and authenticated POST smoke tests before enabling the UI.
- Only after the function is deployed and checked, set Vercel build environment `VITE_APPLE_HEALTH_EDGE_URL=https://<your-supabase-functions-host>/functions/v1/apple-health-sync` and rebuild.
- Without that environment variable, existing live API calls remain unchanged. No database migration is needed: the tables already exist.

**Security review before production activation:** Function uses role-key access only inside the server, token hashes at rest, user auth for key management, and bounded metrics. Confirm replay/rate-limit concurrency behaviour, production CORS origins and provider-side request limits before enabling publicly. The browser diagnostics' existing Lovable-app host tests do not test this new Edge Function host.

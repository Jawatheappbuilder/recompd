# Apple Health API cutover to Vercel

The app already has authenticated TanStack server routes:
- `POST/DELETE /api/public/health/token` (signed-in user)
- `POST /api/public/health/daily` (per-user sync key from Apple Shortcuts)
- `POST /api/public/health/import` (signed-in user)

The database remains the existing Supabase project. This is a hosting move, not a database migration.

## Before enabling the new frontend mode

Set these **server-only** variables on the Vercel RECOMP'D project, in both production and relevant preview environments:

- `SUPABASE_URL` — URL for the existing Supabase project
- `SUPABASE_PUBLISHABLE_KEY` — existing publishable key (used for JWT verification)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only privileged key for health token hashes and daily summaries; never put it in a VITE_ variable.

Inspect `src/integrations/supabase/client.server.ts` for the exact service credential name used by this repo before applying settings.

Do **not** copy key values into issues, commits, PRs, chat, or logs. Configure them in Vercel's Environment Variables panel.

Existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` still need to target the *same* Supabase project for the client.

## Cutover and verification

1. Deploy this branch as a preview with server credentials configured. Check that its API responds to an unauthenticated POST to /api/public/health/token with HTTP 401 (not 500 or 404). Never log a bearer token.
2. Sign in to the preview and create a key. Confirm a single token row exists for that user, with only a hash stored.
3. POST a valid daily summary with that key to the preview /api/public/health/daily; confirm the user's daily summary updates. Check another user's rows cannot be read or modified.
4. Confirm revocation rejects the old token and the rate limit works.
5. Set `VITE_HEALTH_API_MODE=vercel` for the target environment and redeploy. It switches only the Health API and Shortcut endpoint to the hosting origin; account deletion stays on its existing backend.
6. Existing Shortcuts with the old Lovable URL won't automatically change. Tell users to update the URL when migrating, or maintain the old endpoint until all shortcuts are updated.

If credentials aren't configured, leave the mode unset: production continues to use the original Lovable API. Do not expose service keys to browser bundles or public responses.

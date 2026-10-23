# Apple Health daily sync (iPhone)

iPhone web apps cannot read Apple Health. RECOMP'D uses an Apple Shortcuts **Personal Automation** that posts one daily summary. Android uses Health Connect inside the Android app instead.

## Flow
1. Settings → Health & activity → **Create sync token** (signed in). The token (`rcmp_hs_…`) is shown once; only its SHA-256 hash is stored (`health_sync_tokens`). Regenerate replaces it; Revoke deletes it.
2. Shortcut: Find Health Samples (Step Count, today) → Calculate Statistics (Sum); optional Active Energy (Sum), Resting Heart Rate (Average); Format Date `yyyy-MM-dd`; Get Contents of URL:
   - `POST https://project--465a9460-5ace-5d8a-90ae-2e52ab14dc35.lovable.app/api/public/health/daily`
   - Header `Authorization: Bearer <token>` (never in the URL)
   - JSON `{"date":"2026-10-23","steps":8421,"activeKcal":512,"restingHr":58}`
3. Automation: Time of Day, Daily, late evening, **Run Immediately**. iOS may still notify or ask, and Health is unreadable while locked.
4. **Sync now test:** run the Shortcut manually (▶), then refresh the Health settings card.

## Server rules
- Validation: real `YYYY-MM-DD`, within 60 days back / 1 day ahead of Australia/Sydney today; steps 0–200000; kcal 0–20000; HR 20–250; body ≤ 2 KB; unknown keys rejected.
- Upsert on `(user_id, day)` in `health_daily_summaries`; RLS lets users read/delete only their own rows. Writes happen only server-side.
- Rate limit: 30 requests per token per hour (429).
- The token only authorises summary submission, not account access.
- Endpoints run on Lovable hosting (service-role key lives there). The Vercel UI calls `/api/public/health/token` and `/import` cross-origin with the user's access token (CORS allowlist in `src/lib/api-cors.ts`).

Not supported: live sync, Apple Watch workout matching.

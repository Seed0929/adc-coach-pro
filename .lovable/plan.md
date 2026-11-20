# BotDiff billing readiness: read-only findings and next steps

Nothing was changed. Live payments stay off.

## Verified from code and database (no sign-in needed)
- **Get Pro popup gating:** test checkout only appears when the preview is in development mode AND the payment key is a test key (`checkoutAvailable()` in `src/lib/stripe.ts`). The popup itself refuses anything but test mode. On the live site, Pro shows "coming soon".
- **Live switch:** `PLAN_CONFIG.paymentsEnabled = false`; the server also requires a separate live flag that is not set. There is no live payment key file, so live checkout cannot load.
- **Test mode:** only the test payment key is present.
- **Database state:** 0 subscriptions, 0 processed payment events. Nothing fake exists.
- **Webhook:** signature, timestamp and test/live checks, re-fetching the real subscription from Stripe, one-time event processing, and no older event overwriting a newer one are all in the code (`src/routes/api/public/payments/webhook.ts`, `subscription-sync.server.ts`).
- **Pro decisions:** Owner checked first; Pro from payment only, with a valid future end date; test Pro rows ignored for normal players.
- **Earlier test record** (`docs/development/BILLING_TEST_VERIFICATION.md`): 48 unit tests, 77 validation checks, and signed-out (401) and signed-in (403) write attacks recorded as PASS.

## Not confirmed this time
- My database access can't list table permissions or sign-in accounts. I re-checked row counts only, not permissions. The 401/403 results come from the earlier record.
- I didn't re-run the 5 billing test files, because nothing changed.

## Blockers (need a real player session)
1. **No ordinary Free test account confirmed.** Earlier tries used an Owner account with two-step sign-in. Testing there would be wrong, and I won't bypass two-step.
2. The full path needs a real test payment: checkout -> webhook -> Pro unlocks -> cancel in the billing page -> failed card -> renewal.
3. I haven't confirmed that payment notices reach the unpublished preview.
4. Launch blockers: Riot production approval, your launch approval, the legal checklist, and finishing Stripe go-live.

## Safe next actions (after approval)
1. Re-run the 5 billing test files and the monetization/owner checks (read-only).
2. Sign in a temporary Free test user (no Owner role, no two-step). Pay monthly with card 4242 4242 4242 4242 in the preview. Confirm the Pro readback and the subscription row. Use a second temporary user for annual.
3. In the test billing page, cancel and confirm Pro lasts until the period end. Failed-card and renewal tests use Stripe's test card and test clock tools.
4. Record PASS/FAIL/NOT RUN in the verification document. Live stays disabled.

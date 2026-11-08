# BotDiff test billing verification — 2026-11-08

## Status
Implemented and security-checked, **not end-to-end payment verified**. No publish/deploy action was performed. Live checkout and portal mutations are rejected by validators. Checkout UI is development/test-only. `PLAN_CONFIG.paymentsEnabled` remains false. Riot production approval is not verified; live Stripe onboarding is incomplete.

The shared backend migration is applied immediately to both preview and published backend. No subscription, customer mapping or receipt rows were fabricated: all three counts remain zero after verification. Stripe test portal configuration and test webhook event subscription were updated; no live Stripe configuration was changed.

## Completed
- Exact existing test catalog verified by Stripe API: USD 999 cents/month (`pro_monthly`), 7999 cents/year (`pro_yearly`), one recurring interval each; SaaS tax code set, US seller confirmed.
- Cycle-only authenticated checkout input; server validates catalog amount, currency, interval, active state and lookup key. User IDs come only from verified session middleware, including native MFA.
- Private persisted customer mapping; never adopt a customer by email or overwrite another account's customer. Stable customer/checkout idempotency keys and locked checkout reservations.
- Open checkout is reused; simultaneous competing cycle requests fail safely rather than create another checkout. A reserved cycle cannot change until checkout expires (approximately 31 minutes). No plan change/proration feature was added.
- Webhook HMAC, timestamp, event shape and test/live mismatch verification; invalid signatures return 400. Persistence/provider errors return 500 for retry.
- Re-fetch subscription and customer directly from Stripe before writes; validate stored mapping, metadata, quantity, price and environment. Atomic database subscription write and event receipt. Duplicate IDs are no-ops; older events cannot overwrite newer event timestamps; a canceled subscription ID cannot become active again. Subscription cancellation at period end remains active until its actual end, after which access fails closed.
- Active/trialing/past_due/canceled require a valid future period end. Unpaid/incomplete/expired/paused never grant Pro. Past-due grace is bounded by that verified end, not an invented extra period.
- Owner wins before billing; ordinary users cannot use internal test Pro rows. Unsupported subscription prices do not grant access.
- Return page verifies checkout ownership/payment state and corresponding webhook-written subscription; arbitrary URL parameters and Owner entitlement cannot manufacture payment success.
- Test portal configured for cancellation at period end, payment-method updates and invoices. Handler selects that explicit safe configuration. Settings refetches on window focus and shows status/errors/payment-failure warning.

## Verification evidence
| Check | Result | Evidence |
| --- | --- | --- |
| Focused unit tests | PASS | 48 tests / 8 files: billing status/policy/signature/sync/entitlement, MFA, legal signup/contact |
| Existing Owner validation | PASS | 20/20 |
| Existing monetization validation | PASS | 37/37 |
| Existing authenticated coaching validation | PASS | 20/20 |
| Automatic typecheck/build | PASS | Latest observability entries report build OK after edits |
| RLS and grants | PASS | subscriptions retains two SELECT policies (owner-scoped permissive + MFA restrictive); authenticated SELECT only, anon no access, service role write access |
| Private billing tables / functions | PASS | RLS enabled, no anon/authenticated privileges; only service role may execute reserve/apply functions |
| Anonymous negative requests | PASS | Inserts, actual updates and deletes on four billing tables plus reservation RPC return 401 |
| Signed-in negative requests | PASS | Inserts, actual updates, deletes and reservation RPC return 403; private table reads denied |
| Public browser | PASS | Monthly default, Annual selection, invalid return rejection, unsigned/invalid-env webhook 400; no runtime errors, no mobile overflow at 390px |
| Native MFA boundary | PASS | Minted account is challenged before protected UI; no bypass attempted |
| Stripe external configuration | PASS | Correct prices/tax code/country; enabled test app webhook; test portal cancellation at_period_end, invoices and payment-method updates enabled |
| Full checkout payment to Pro | NOT RUN | Available managed session hits native MFA challenge and belongs to an Owner; do not bypass MFA, strip Owner role or manufacture subscription |
| Portal cancellation / failed card / renewal through Stripe | NOT RUN | Needs a real test subscription from ordinary Free user's checkout |
| Isolated SQL concurrency/replay tests | NOT RUN | No isolated database provisioned; no manufactured subscriptions in shared database |

The first negative PATCH used an empty payload and returned a harmless 204 without an SQL write. It was rerun with actual mutation fields and every unauthorized PATCH returned 401/403. Read requests selecting zero rows do not prove enrolled users can read protected records; there are no subscription rows, and the restrictive MFA SELECT policy remains present.

## Exact application files
- `src/lib/billing/billing.functions.ts`
- `src/lib/billing/billing-policy.ts`
- `src/lib/billing/subscription-sync.server.ts`
- `src/lib/billing/billing-status.test.ts`
- `src/lib/billing/billing-policy.test.ts`
- `src/lib/billing/subscription-sync.test.ts`
- `src/lib/billing/entitlement-security.test.ts`
- `src/lib/billing/webhook-signature.test.ts`
- `src/lib/stripe.ts`, `src/lib/stripe.server.ts`
- `src/lib/entitlements/entitlements.server.ts`
- `src/routes/api/public/payments/webhook.ts`
- `src/routes/checkout.return.tsx`, `src/routes/pricing.tsx`
- `src/components/pro/pro-checkout-dialog.tsx`
- `src/components/pro/plan-settings.tsx`
- `src/components/pro/payment-test-mode-banner.tsx`
- `src/components/pricing/pricing-plans.tsx`
- `AGENTS.md`, `roadmap.md`, this report

Database SQL is recorded exactly in `drizzle/migrations/0006_secure_billing_lifecycle.sql`; journal/snapshot and generated database types were updated by the migration tool. Existing P0 grants were not relaxed.

## Remaining verification steps / launch blockers
1. Sign into the editor preview as an ordinary Free test account; complete native MFA if enrolled. Do not share passwords or authenticator secrets in chat.
2. Monthly test card 4242 4242 4242 4242: confirm embedded form, return verification, real webhook receipt/subscription row and server Pro readback. Exercise annual checkout with a separate ordinary test account to avoid duplicate subscription charges.
3. Repeat notification, cancellation, final payment failure and renewal against that real test subscription; verify database and UI readback. Confirm portal opens in a standalone preview tab.
4. Confirm hosted preview webhook delivery reaches this unpublished implementation. Local browser checks alone do not establish external delivery.
5. Verify Riot production approval, owner live launch approval, legal checklist and Stripe live readiness before designing/enabling live checkout. This implementation deliberately has no working live purchase path.

No Riot API key, Riot functionality, chatbot or public pricing amount was changed. Existing Free report metering has a separately identified count-then-insert concurrency risk; it was not changed in this subscription-focused task.
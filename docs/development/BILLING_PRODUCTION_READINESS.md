# BotDiff real-payment readiness — 2026-11-20

## Code-only settlement/live-path follow-up — 07:10 UTC

This section supersedes earlier statements that runtime code is unchanged or live credentials are absent. The subsequent read-only audit confirmed live Stripe connection, keys, exact live lookup-key prices and enabled endpoint, but no live portal configuration. The following authorized edits are preview-only; no Stripe settings, credentials, database migrations or charges were changed.

- Initial access now independently verifies the original `subscription_create` invoice directly with Stripe: paid, zero remaining, matching subscription/customer/environment. Neither an active row, event snapshot nor a paid renewal alone establishes initial settlement. Existing paid subscription readback using the new helper returned true (test environment, read-only).
- Webhook sync stores unsettled active/trialing/past_due as incomplete. Owner checks remain first. Entitlement reads check original settlement independently, protecting existing rows without schema/backfill changes. Provider errors fail closed; this adds Stripe invoice lookups to paid entitlement reads and can temporarily withhold ordinary Pro if Stripe is unavailable. Pagination caps at 2,000 invoices and fails closed beyond that; durable settlement evidence is a future separately reviewed optimization.
- Purchase verification requires completed checkout, non-unpaid session, trusted owned webhook row and independently settled original invoice. Supports validated test/live session IDs, but production calls remain disabled.
- Live checkout/portal branches select environment-specific credentials/mappings and validate exact production origin/return paths. `LIVE_BILLING_IMPLEMENTATION_ENABLED=false` plus existing `paymentsEnabled=false`/server launch flag keep production off. No browser checkout gate changed. The existing database reservation RPC still rejects live; no code-only request can bypass that safeguard. A separately approved migration is required before future live activation.
- Portal selects only matching test/live marked configurations with correct mode, enabled end-of-period cancellation and (live) nonempty legal URLs. Because no live configuration exists and all live billing is disabled, no live portal action is available. The UI remains unchanged/test-only.
- Invoice action-required/failed/paid routing has current and legacy subscription extraction; subscription-related invoices missing a reference fail with retry rather than silently acknowledge. Action-required is supported in code already and covered by new tests; adding it to the live Stripe event subscription remains an external approval task.
- PASS: 66 focused tests in 10 suites, Owner 20/20 and Free 37/37; latest automatic build/typecheck OK. NOT RUN: 10 opt-in SQL integration tests this turn (no schema changes; prior isolated run documented below), actual live signature delivery, new annual payment, real renewal/decline/recovery and browser end-to-end after these changes. No claim of real live webhook validation.
- Deferred explicit cancel_at storage/notice is unchanged.

Changed application files: `src/lib/billing/settlement.server.ts`, `lifecycle.ts`, `billing-policy.ts`, `billing.functions.ts`, `subscription-sync.server.ts`, `src/lib/entitlements/entitlements.server.ts`, `src/routes/api/public/payments/webhook.ts`, `src/routes/checkout.return.tsx`. Tests: new `settlement.test.ts`; updated `billing-policy.test.ts`, `entitlement-security.test.ts`, `subscription-sync.test.ts`. Documentation: this report, `AGENTS.md`, `roadmap.md`.

Remaining approval/setup: create live portal with marker `botdiff=live_billing`, cancellation at period end, invoices/payment recovery and adopted legal URLs; add `invoice.payment_action_required` to live app webhook using supported tool only after explicit Stripe-setting approval. Before activation: verify Riot approval/legal adoption, approve audited live reservation migration and final UI enablement, real signed delivery and end-to-end checks, then separate explicit go-live/publish approval. Do not toggle either activation guard now.

## Release decision: NOT READY / live charges remain disabled

No publishing, live activation, live Stripe configuration, secret changes or shared database migrations were performed. Runtime application code is unchanged. `PLAN_CONFIG.paymentsEnabled=false`; checkout/portal validators accept only sandbox and approved preview origins. Setting a live key or environment flag alone cannot enable a purchase. No verified P0 defect was reproduced in the scoped subscription security/lifecycle checks, so no production behavior was changed.

## Fresh evidence

| Check | Result | Evidence and limits |
| --- | --- | --- |
| Test catalog | PASS | Stripe API: active BotDiff Pro product, SaaS tax code `txcd_10103001`; `pro_monthly` = USD 999 cents/month, `pro_yearly` = USD 7999 cents/year, licensed quantity. Same test product for both. |
| Annual embedded form | PASS, partial | Temporary non-Owner Free account opened Annual then Get BotDiff Pro locally; real Stripe embedded TEST MODE form rendered, annual recurrence visible, no page errors. Screenshot inspected. This created/reused a real test checkout/customer mapping, not a subscription. |
| Annual paid checkout → webhook → Pro | NOT RUN | No annual payment was submitted. Prior headless payment attempts were blocked by Stripe's invisible bot check; do not manufacture a successful purchase. Existing actual subscription is monthly only. |
| Location taxes/currency | PASS, observation only | Annual form initially EUR 91.69 in Netherlands; selecting USD showed $96.79 (consistent with 21% VAT over $79.99). Country change could not be completed by the script; detailed tax breakdown/US total NOT VERIFIED. Catalog base remains $79.99, not $96.79. |
| Current real test subscription | PASS | Read-only Stripe and Cloud: one active monthly sandbox subscription, period end 2026-12-20 05:29:52 UTC; scheduled `cancel_at` equals that end; `cancel_at_period_end=false`. No player/session identifiers recorded here. |
| Real test webhook processing | PASS, bounded | Four stored sandbox receipts, latest 2026-11-20 05:30:56 UTC, agree with current subscription state. Actual Stripe subscription-created/updated, checkout-completed and invoice-paid events report zero pending webhooks. Previous monthly payment verification is historical evidence, not a new purchase test. |
| Deployed billing permissions | PASS | Fresh `has_table_privilege` queries: anon no access; authenticated SELECT-only on subscriptions/entitlements, no INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER; no access to private customer/receipt tables; service_role keeps writes. RLS enabled. Subscription own-row SELECT + restrictive MFA SELECT retained. RPC ACLs service_role/postgres only. |
| Webhook auth/ownership | PASS | HMAC + freshness + event environment checks; authoritative Stripe subscription/customer/price re-fetch; stored mapping and both ownership metadata checks; quantity=1; errors retry with HTTP 500. Covered by focused unit tests; live signature verification NOT RUN. |
| Isolated real SQL replay/concurrency | PASS | Existing migrations 0002/0005/0006 executed in disposable loopback PostgreSQL 17. Eight concurrent deliveries: exactly one applied, seven duplicate, one row and one receipt. Stale notification cannot overwrite newer state. Competing annual/monthly reservations: one succeeds, one rejects. No shared/player rows used. |
| Failed payment/downgrade/recovery/renewal | PASS, isolated only | Real SQL RPC persists past_due (access until valid end), unpaid (no access), active recovery, renewed future period; exact expiry denies. Existing authoritative Stripe re-fetch unit tests also pass. No real Stripe failed-payment/retry/renewal was triggered. |
| Escalation/isolation/MFA | PASS, bounded | Isolated actual SQL write and RPC attacks rejected for anon/authenticated; ownership/environment mismatch rolls back with no receipt; own-row SELECT denied at simulated aal1 and allowed at simulated aal2. Native MFA SDK lifecycle is not exercised by this SQL fixture. Owner unit and 20 existing validation checks pass. |
| Full focused suite | PASS | 62 tests in 10 files: billing suites (including 10 new SQL integration tests), native MFA policy, legal contact/signup. Initial local DB setup/path/type errors corrected; final full run 62/62. |
| Existing regressions | PASS | Owner 20/20; monetization 37/37; authenticated coaching 20/20 (77 total). |
| Automatic typecheck/build | PASS | Latest observed build entry after test typing correction: 2026-11-20 05:47:07 UTC, build OK. No manual app build/typecheck run. |
| Live Stripe account | FAIL readiness | Go-live: account claimed; Stripe onboarding in_progress; live app installation, key provisioning and readiness check not_started. Only test connection available. Test account API country US; charges_enabled=false/payouts_enabled=false describes the test account, not an inspected live account. |
| Live private/public keys | NOT RUN / absent | Secret inventory contains test connection/signing credentials only; live connection/signing names absent. Development public token configured; no `.env.production` file/live public token found locally. No values exposed or manually created. |
| Live catalog/webhook/portal | NOT RUN | No live connection exists to inspect these. Test IDs must not be assumed to be live IDs. Publishing normally syncs catalog, but publishing was not authorized or attempted. |
| Riot production approval | NOT VERIFIED | No authoritative approval evidence supplied/read. Working Riot requests or possession of an API key is not approval. |
| Legal readiness | FAIL readiness | Seven factual draft/noindex pages exist; contact botdiffgg@gmail.com. Legal identity/adoption, refund/request handling, retention/deletion, processor/tax responsibilities and provider-wide acknowledgment review remain open. Test portal privacy/terms URLs are null. Do not point a real paid checkout at unadopted drafts. |

### Test webhook configuration inspected

App endpoint: approved stable dev host `/api/public/payments/webhook?env=sandbox`, enabled, Stripe payload version `2025-03-31.basil`. SDK request version remains `2026-03-25.dahlia`; item period fields and invoice.parent subscription extraction match the inspected code, but live payload shape requires testing.

App events: customer.subscription.created/updated/deleted; checkout.session.completed/async_payment_succeeded/async_payment_failed; invoice.paid/payment_failed/payment_action_required. Analytics endpoint is separate and must not be deleted. Test signing secret is configured; existing processed payments establish historical test verification. Nothing rotated.

Test portal: active `botdiff=test_billing`, cancellation enabled at_period_end with no proration, payment method update and invoice history enabled; subscription updates/pauses disabled. Real monthly portal cancellation was previously completed by the owner; no fresh portal action was taken.

## Deferred issue (explicitly not fixed)

Stripe portal can schedule cancellation using `cancel_at` while returning `cancel_at_period_end=false`. `subscription-sync.server.ts` does not persist `cancel_at`; `plan-settings.tsx` shows cancellation notice only from the boolean. Thus Settings can miss the scheduled-cancellation notice. Access still expires at verified current_period_end. Keep this issue visible for final launch review; do not claim UI cancellation representation is complete.

## Safe remaining manual tests (TEST environment only)

1. Use a separate ordinary Free account in `preview--botdiffgg.lovable.app` (not the existing active monthly subscriber). Select Annual; inspect base price $79.99/year, currency and taxes; complete Stripe's form with 4242 4242 4242 4242, future expiry, CVC and complete valid test billing address. Then verify paid invoice, yearly active subscription, signed webhook receipt, sandbox row and fresh signed-in Settings/Pro readback. Do not send card/session/account details in chat.
2. Initial decline: separate Free account, test card 4000 0000 0000 0002. Confirm no Pro activation and no successful invoice. Test 3DS with Stripe's documented test card separately if needed.
3. For renewal/retries/recovery use a separately approved disposable Stripe test-clock customer/subscription, not the user's canceling subscription. Confirm failed invoice → past_due, configured retry exhaustion → unpaid/canceled, then a valid payment method and paid renewal → authoritative active future end. Test-clock fixtures alone do not verify BotDiff mapping/webhooks; use a trusted app-linked test fixture and inspect all three layers.
4. Confirm live-mode event to test endpoint rejects, test-mode event to live rejects, and genuine Stripe replay reaches the hosted endpoint without changing receipt count. Real provider resend/concurrency NOT RUN; only isolated SQL and unit replay tested here.
5. Test signed-in portal invoices/payment-method update and refresh after returning; real MFA enrolled-account billing checks and hosted annual purchasing require that user session.

## Separate final go-live checklist — all required before any activation

- [ ] Obtain and record authoritative Riot production approval and approved monetization scope; retain meaningful Free Riot access.
- [ ] Owner/legal review and adoption of terms/privacy/refund/renewal/tax disclosures; set verified final URLs in checkout/portal, approve merchant responsibilities and managed-payments fees. No invented refund policy.
- [ ] Finish Stripe onboarding and install Lovable on live account through Payments. Lovable provisions live keys/webhook automatically; do not paste BYOK keys or manually duplicate endpoints.
- [ ] Inspect live catalog by stable lookup keys `pro_monthly`/`pro_yearly`, exact USD 999/7999 cents, correct same logical product identity, tax code, quantity and recurrence. Inspect live product/price IDs only once provisioned.
- [ ] Verify live signing secret configured, enabled app endpoint is production `/api/public/payments/webhook?env=live`, signature verification and matching event shape/version. Add invoice.payment_action_required with supported tool if absent; retain analytics endpoint.
- [ ] Configure and verify a separate live portal with end-of-period cancellation, invoices and payment recovery plus adopted legal URLs. Current handler deliberately selects test portal only.
- [ ] Complete annual purchase, decline, renewal, recovery, cancellation/expiry, replay and real signed-in Pro checks above; review deferred cancel_at notice.
- [ ] Approve separate live implementation: current checkout/portal/return status and reservation RPC are intentionally sandbox-only. Extend them with audited production-origin/return-path authorization and strict live credentials/mapping/rows; production must never accept a test token, test session, client user/price/environment override or forwarded-origin bypass. An env toggle alone is insufficient.
- [ ] Re-run security/RLS/MFA/Owner and production-vs-preview isolation tests and Payments readiness checks after live provisioning.
- [ ] Obtain separate explicit final go-live/publish approval. Only then change activation guards and publish; none of this was done here.

## Changes / reproducibility

- Added `src/lib/billing/billing-database.integration.test.ts` (local-only destructive fixture guard; omitted env => skipped).
- Updated this report, historical billing report, legal prepublication audit, roadmap and architecture test rule. No application functionality changed.
- Run isolated suite with `BOTDIFF_BILLING_TEST_DATABASE_URL=postgres://<local-user>@127.0.0.1:<local-port>/botdiff_billing_test bunx vitest run src/lib/billing`. Never use the managed database URL; fixtures destroy the disposable public schema. Native auth checks are simulated only within that fixture.
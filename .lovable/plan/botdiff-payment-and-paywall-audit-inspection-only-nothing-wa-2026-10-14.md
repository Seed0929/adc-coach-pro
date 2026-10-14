# BotDiff payment and paywall audit (inspection only, nothing was changed)

## Summary
BotDiff has a finished paywall, and the server enforces it. It has no way to take payments. Prices are only displayed, and no Stripe, Paddle, checkout, subscription, webhook, customer portal or referral code exists anywhere in the project.

## What works
- **Pricing page:** the page defaults to Monthly (`src/components/pricing/pricing-plans.tsx`, line 116: `useState<BillingCycle>("monthly")`). It shows $9.99/month and $79.99/year, with ≈$6.67/month and a "Save 33%" badge that are calculated from those prices. The prices are defined in `PRICING` in `src/lib/entitlements/plan.ts`, and the page lives at `src/routes/pricing.tsx`. The Pro button opens an honest "coming soon" panel.
- **Free tier:** 3 full coaching reports per week (`PLAN_CONFIG.freeFullReportsPerPeriod`). The server meters them in `ensureFullReportAccess` (`src/lib/entitlements/entitlements.server.ts`). Reports a player already unlocked stay readable, and the weekly reset date shown is real.
- **Server-side Pro checks:**
  - `loadPlan` resolves Owner first (via the `has_role` check), then `user_entitlements.plan`, then falls back to Free.
  - Report unlocks are written with the privileged server client; players can only read their own plan and grants.
  - Owner gets every Pro capability from the Pro list (`plan.ts`).
  - The browser hook `src/hooks/use-entitlements.tsx` only displays the plan, and it shows Free if anything fails.
- **Internal test switch:** a Free/Pro switch in Settings (`src/components/pro/plan-settings.tsx`) calls `setDevPlan` (`src/lib/entitlements/entitlements.functions.ts`). In production the server only allows it for admins, owners, or when `BOTDIFF_ALLOW_PLAN_TOGGLE` is set (`devToggleAllowed`).
- **Automated checks:** `pricing-5-15.ts` and `monetization-5-13.ts` assert that `paymentsEnabled === false` and that the pricing pages contain no checkout or card-entry code.

## What's missing or incomplete
- **Payment provider:** none. `PLAN_CONFIG.paymentsEnabled: false`, and `package.json` has no Stripe or Paddle package.
- **Checkout:** none. The "Get BotDiff Pro" button only opens the coming-soon panel.
- **Subscriptions and webhooks:** no routes under `src/routes/api/`. `user_entitlements` only has `plan`, `source` and timestamps: no subscription ID, status, renewal date or cancellation fields.
- **Billing cycle after payment:** the Monthly/Annual choice only lives on the page and isn't passed anywhere yet.
- **Cancellation and customer portal:** none. Dropping back to Free on cancellation works in code, but nothing triggers it.
- **Test vs live payment modes:** not applicable yet. The only test path is the internal plan switch.
- **Referrals and affiliates:** nothing exists (no code, tables or tracking parameters). `beta_events` only tracks pricing and upgrade-interest events.
- **Old leftover field:** an early migration (`supabase/migrations/20260701054937_...sql`) added `profiles.subscription_tier`. It isn't used for access and could confuse future work.
- **Out-of-date document:** `docs/07_Monetization.md` still promises "Unlimited Quick Ask", which was removed.

## Riot API approval considerations
- The Riot key is read on the server only (`src/lib/riot.server.ts`, `RIOT_API_KEY`), with caching and rate-limit messages.
- Riot's policies generally allow charging for your own coaching analysis, but not putting Riot data itself behind a paywall. The current design matches that: Free keeps sync and real stats, and the pricing page says Pro pays "not for Riot's data".
- Keep the full disclaimer (`src/components/public-footer.tsx`) and `public/riot.txt` in place.
- Don't take payments until the production key is approved. A development or personal key isn't allowed for a public paid product.

## Prioritized next steps (only if you approve)
1. Confirm Riot production key approval before turning on any payments.
2. Set up payments through Lovable's built-in payments (start that from the Lovable editor chat). This needs a Lovable Pro plan.
3. Add subscription fields to `user_entitlements` (provider, subscription ID, status, billing cycle, renewal date, cancel-at-period-end). Have the payment provider's webhook route set `plan` on the server; keep the Owner role resolved first.
4. Checkout: send the selected billing cycle from `pricing-plans.tsx`. Replace the coming-soon panel only when `paymentsEnabled` is on.
5. Add a customer portal link in Settings for cancelling and changing plans. Downgrading must keep reports already unlocked.
6. Separate test and live payment modes, and limit the internal plan switch to admins and owners in production.
7. Optional: referral tracking (a captured referral code plus an attribution table).
8. Cleanup: remove or retire `profiles.subscription_tier`, and update `docs/07_Monetization.md`.

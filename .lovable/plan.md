# BotDiff billing audit and implementation plan (read-only, nothing changed)

## Current implementation

### Pricing and paywall (complete, display-only)
- `src/lib/entitlements/plan.ts`:
  - `PRICING`: Free $0, Pro $9.99/month, Pro $79.99/year.
  - `annualMonthlyEquivalent()` returns $6.67 and `annualSavingsPercent()` returns 33.
  - `PLAN_CONFIG`: `paymentsEnabled: false`, `freeFullReportsPerPeriod: 3`.
  - `CAPABILITIES`: Owner inherits everything from the Pro map automatically.
- `src/components/pricing/pricing-plans.tsx`: defaults to Monthly (`useState<BillingCycle>("monthly")`). Annual shows a calculated "Save 33%" badge. The Pro button opens a "coming soon" panel that offers "Continue with Free".
- `src/routes/pricing.tsx`: public pricing page.
- Other surfaces with upgrade prompts:
  - `src/components/pro/upgrade-dialog.tsx`
  - `src/components/pro/pro-lock.tsx` (locked previews and the Free allowance card)
  - `src/components/pro/plan-settings.tsx` (plan shown in Settings)

### Enforcement (complete, server-side)
- `src/lib/entitlements/entitlements.server.ts`:
  - `isOwner` uses the `has_role` check; `loadPlan` resolves Owner, then `user_entitlements.plan`, then Free.
  - `ensureFullReportAccess` meters the 3 Free reports per week. Reports already unlocked stay readable, and grants are written with the privileged server client.
  - `writePlan` is only used by the internal test switch and can only write "free" or "pro".
- `src/lib/entitlements/entitlements.functions.ts`: `getEntitlements` and `setDevPlan`. The switch is gated by `devToggleAllowed`, which allows non-production, admin/owner, or `BOTDIFF_ALLOW_PLAN_TOGGLE`.
- `src/hooks/use-entitlements.tsx`: display only, and it shows Free on any error.
- **Tables:**
  - `user_entitlements` (`user_id`, `plan`, `source`, timestamps): players can only read their own row.
  - `coaching_report_grants`: players can only read their own rows.
  - `user_roles`: holds the Owner role, with no client writes.
- **Validation suites:** `monetization-5-13.ts`, `pricing-5-15.ts`, `owner-access-5-14.ts`.

### Billing integration: none
- No Stripe or Paddle package in `package.json`.
- No checkout, no webhook routes (no `src/routes/api/`).
- No subscription fields, no billing or customer portal.
- No test vs live payment modes.

### Affiliate, referral and commission: none
- No code, tables, tracking parameters, attribution or payout logic.
- `src/lib/analytics/beta-events.ts` only records pricing and upgrade-interest events.

## Security risks found
1. `profiles.subscription_tier` (added by an early migration) is a column players can edit themselves: profiles have an "update own profile" rule. Nothing uses it for access today. If future code ever reads it, players could give themselves Pro. Retire it.
2. The `BOTDIFF_ALLOW_PLAN_TOGGLE` setting, if left on in production, would let any signed-in player switch themselves to Pro. Payments launch must make sure it's off.
3. The webhook doesn't exist yet. When it's added, it must check the payment provider's signature and write plans only through the privileged server client.
4. The existing database-linter warning about the `has_role` check is still open. It's intentional and low-risk, but it should be documented.

## What to keep unchanged
- Monthly stays the default at $9.99/month; Annual stays at $79.99/year.
- Free keeps Riot sync, real stats, full individual coaching, Today's Focus and 3 full reports a week, and reports already unlocked always stay readable.
- Owner is resolved first and never depends on billing.

## Prioritized implementation plan (for later approval)
1. **Before taking money:** confirm Riot approves the production key, and turn off the internal switch setting in production.
2. **Enable Lovable's built-in payments** (Stripe-based, no separate account needed). This needs a Lovable Pro plan, and is started from the Lovable editor chat.
3. **Data:** add to `user_entitlements`: `provider`, `customer_id`, `subscription_id`, `status`, `billing_cycle`, `current_period_end`, `cancel_at_period_end`. Add a `billing_events` table to log every webhook once, for idempotency. Players can only read their own rows; only the server writes.
4. **Webhook route** under `src/routes/api/public/`, with a signature check:
   - Payment completed or subscription renewed: set Pro.
   - Cancelled at period end: keep Pro until the period ends.
   - Ended or payment failed past the grace period: set Free.
5. **Checkout:** a signed-in server function creates checkout for the chosen Monthly or Annual option, using the existing pricing selector. Swap the "coming soon" panel for checkout only when `paymentsEnabled` is on.
6. **Billing portal:** a "Manage billing" link in `plan-settings.tsx` for cancelling, changing plans and updating cards.
7. **Test and live modes:** separate keys and webhook secrets, and add validation-suite checks for the subscription lifecycle.
8. **Referrals (optional):**
   - `referral_codes` and `referral_attributions` tables; capture `?ref=` on first visit and attach it at signup on the server.
   - Commissions are calculated only from verified webhook payments, in a `referral_commissions` table that is server-write-only.
   - Payouts stay manual at first.
9. **Cleanup:**
   - Retire `profiles.subscription_tier`.
   - Update `docs/07_Monetization.md`, which still mentions Quick Ask.
   - Update `docs/OWNER_ACCESS.md` to note that Owner is never affected by billing.

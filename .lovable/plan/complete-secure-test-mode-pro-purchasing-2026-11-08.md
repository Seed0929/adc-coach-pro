# Complete secure test-mode Pro purchasing

## Scope
- Preserve $9.99 monthly, $79.99 yearly, monthly default, Free’s three weekly reports, and Owner access.
- Complete existing Stripe purchasing and billing controls in test mode only. Do not publish or enable live payments.

## Security and implementation
- Preserve the verified P0 permissions: players have owner-scoped, MFA-protected reads only; trusted webhook writes remain available.
- Select and validate prices server-side from the chosen billing cycle. Reject live requests and untrusted return destinations.
- Persist customer/user mapping and checkout reservations so repeat or parallel requests cannot create duplicate purchases.
- Verify signatures and environment, retrieve authoritative Stripe subscription/customer state, and atomically record webhook receipts and subscription updates. Reject mismatched identities and unsupported prices; retain cancellation access only through the verified period end.
- Handle renewals, failed payments, final failure, cancellation and replayed/out-of-order notifications without granting access from a redirect or browser metadata.
- Make checkout failures visible, verify purchase status on return, and show subscription status plus cancellation/payment-method management in Settings.

## Verification
- Run focused security/lifecycle tests, read-only permission checks and safe negative requests.
- Exercise signed-in checkout for both prices and a test payment where possible; verify the resulting webhook record and Pro entitlement. Never fabricate production subscriptions.
- Record exact changed files, PASS/FAIL/NOT RUN evidence and any unavailable external checks.

## Existing setup confirmed
Stripe test connection and both correct USD prices exist. Seller country is US and the SaaS tax code is set. Existing tax handling remains: +3.5% per transaction, with LINK.COM* statement descriptor. Live onboarding is incomplete and Riot production approval is not verified.

## Technical details
Use existing native MFA middleware, supported gateway Stripe utility and embedded checkout. Add database changes through the migration tool, with explicit grants and RLS. Database changes affect the shared backend immediately; application edits remain unpublished.
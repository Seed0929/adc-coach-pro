# Sprint 5.9 — Pre-Beta Security, MFA + Feedback Polish

Scope: close remaining practical pre-beta account/security issues and polish the
existing feedback UI. No UI redesign, no coaching changes, no Riot/timeline or
Decision Chain V1 changes.

## 1. MFA

Provider: Lovable Cloud auth (Supabase Auth). Native MFA factor types are
`totp` and `phone` **only** — there is no email MFA factor.

| Option | Real status | Notes |
| --- | --- | --- |
| Authenticator app (TOTP) | **Implemented and working** | Provider enrollment + `challengeAndVerify`; grants aal2. |
| Text message (SMS / provider `phone` factor) | **Implemented in app, blocked on external config** | Requires phone auth enabled + an SMS gateway on the project. Project currently reports `external.phone = false`, so the UI shows "Not available yet" and states the requirement. Nothing is faked as enabled. |
| Email | **Not a second factor** | Email OTP / magic link is a *primary sign-in verification* and yields aal1. Surfaced as "Not a second factor" with an explanation. Never presented as MFA. |

Key files:
- `src/lib/security/mfa-factors.ts` — pure factor catalog/availability policy.
  `isFactorEnabled()` requires a provider-**verified** factor, so availability
  alone can never read as "enabled".
- `src/lib/security/mfa.ts` — provider wrappers (TOTP + phone enrollment/verify).
- `src/lib/security/account-security.functions.ts` — server-derived status now
  also returns verified factor kinds and the real provider SMS configuration
  state (`phoneAuthEnabled`, `smsProviderConfigured`). No secrets returned.
- `src/lib/security/account-security.server.ts` — `readProviderAuthCapabilities()`
  reads the provider settings server-side; any failure reports "not configured".
- `src/components/mfa-settings.tsx` — rebuilt Settings presentation: one card per
  factor, explicit Enabled / Not enabled state, single primary action, stepped
  setup (1 of 2 / 2 of 2), explicit Cancel that unenrolls the pending factor,
  clear error copy. The TOTP setup key is rendered only during enrollment.

Enforcement unchanged: `requireVerifiedSession` still layers on
`requireSupabaseAuth` and fails closed via `assertSessionAssurance`. No MFA
secret or verification code is logged or written to any application table.

## 2. Feedback selectors

`src/components/feedback-dialog.tsx` no longer uses native `<select>/<option>`
(OS-painted, unreadable in the dark theme). Both the report-type selector and the
coaching-verdict selector now use the project's shadcn `Select` primitive, with
themed contrast, hover (`focus:bg-primary/20`), selected
(`data-[state=checked]`) and visible keyboard focus (`focus:ring-2`). All report
type and verdict values are unchanged; the data contract is unchanged.

Exactly **one** user-written free-text field remains (the description
`Textarea`). No summary/title input exists anywhere in the dialog; the stored
`title` is still derived from the description via `deriveTitle()`.

## 3. `feedback_reports` scanner warning — intentional (SECURITY NOTE)

Warning: `MISSING_UPDATE_POLICY / feedback_reports_missing_update_delete`.

This is **intentional and must not be "fixed"** by adding an UPDATE policy.
`feedback_reports` is deliberately append-only for end users:
- INSERT: owner only, `status` constrained to `new`.
- SELECT: owner only.
- UPDATE / DELETE: no policy → denied for all normal users.

Consequence: a user cannot alter `status`, ownership, moderation or reviewer
state — which is exactly the property the warning would otherwise flag as
missing. Report triage is an out-of-band/admin activity; no admin role system
and no status transitions exist in the app (deliberately out of scope). Do not
add UPDATE/DELETE policies for `authenticated` to silence the scanner.

## 4. Dependencies

Package manager: **bun** (`bun.lock`, text lockfile). Fixed with targeted
`overrides` in `package.json` (patch/minor only, no major app upgrades):

| Package | Before | After |
| --- | --- | --- |
| brace-expansion | 1.1.14 + 5.0.5 | 1.1.18 |
| nanoid | 3.3.12 | 3.3.18 |
| postcss | 8.5.15 | 8.5.26 |
| js-yaml | 4.1.1 | 4.3.1 |
| @babel/core | 7.29.0 | 7.29.7 |
| esbuild | 0.25.12 / 0.27.7 | 0.28.2 |

All are build/dev-time transitive packages; none sit on the deployed coaching
request path. Production build, typecheck and all suites pass after the bump.

## 5. Leaked-password protection

HIBP / breached-password checking is **enabled** on the auth configuration
(`password_hibp_enabled = true`). No custom breach database, no password
storage/logging, no hashing changes.

## 6. Tests

New suite: `bun run src/lib/coaching/coaching-validation-v1/mfa-feedback-5-9.ts`
— 42/42 PASS (factor honesty, TOTP flow preserved, invalid verification fails,
fail-closed enforcement, no secret/code leakage, selector values preserved,
single description field, ownership/status protection).

Regression baseline re-run and green: 5.4 21/21, 5.5 20/20, 5.6 18/18,
5.7 37/37, 5.8 42/42, coaching 49/49, decision chain 31/31, beta readiness
16/16. Typecheck clean; production build clean.

## 7. Remaining external configuration

- SMS MFA: needs phone auth + an SMS gateway configured for the project before
  the option becomes selectable. The app already wires the provider's `phone`
  factor and surfaces the requirement.
- Email MFA: not achievable as a true second factor with the current provider.
- Report triage remains out-of-band until an admin surface is built (later sprint).

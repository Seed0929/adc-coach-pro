# Sprint 5.10 — Pre-Beta Security, MFA Completion, Backend Hardening

Audit-and-verify sprint. No UI redesign, no new features, no coaching changes.

## MFA model (honest, provider-derived)

| Factor | Real second factor? | State |
| --- | --- | --- |
| Authenticator app (TOTP) | Yes — provider mints `aal2` after challenge | Implemented |
| Text message (SMS) | Yes, via the provider's native `phone` factor | `needs_config` — project has `external.phone = false`; no usable SMS gateway. Never shown as enabled. |
| Email | No — email OTP / magic link is primary sign-in verification and yields `aal1` | `unsupported`, labelled as sign-in verification, cannot be turned on |

Enforcement is unchanged and fail-closed: `requireVerifiedSession` reads `aal`
from the VERIFIED token claims and, when the level is not `aal2`, asks the
provider (admin API) whether the user has any verified factor. Any error
rejects the request. Client MFA state is UX only.

### Fixes made this sprint

1. **Multiple verified factors** — the login challenge previously always used
   `verifiedFactors[0]` and always said "authenticator app". It now lets the
   user pick a factor and uses the right copy per factor type.
2. **Phone factor challenge** — added `sendMfaChallenge` / `verifyMfaChallengeCode`
   so a phone factor's code is actually issued by the provider before
   verification, instead of assuming TOTP semantics.
3. **Stale MFA state** — enrolling or removing a factor in Settings now also
   refreshes the app-wide provider-derived MFA state.

Audited and found clean: no client-controlled "MFA enabled" flag, no
`requireVerifiedSession` bypass, no secret/setup-key exposure in server status
(`AccountSecurityStatus` returns only booleans, counts and factor *types*), no
MFA secrets or codes persisted in application tables, no downgrade path from
`aal2`, factor removal is a provider unenroll so state cannot survive it.

## Feedback system — verified, intentionally append-only

`feedback_reports` has owner INSERT (with `status = 'new'` forced) and owner
SELECT only. UPDATE and DELETE are denied to all normal users.

The scanner finding `MISSING_UPDATE_POLICY / feedback_reports_missing_update_delete`
is **intentional and not a vulnerability**: there is no policy through which a
user can change `status`, ownership or moderation state, which is exactly the
attack the warning describes. Adding an UPDATE policy to silence the scanner
would create the vulnerability it warns about. Triage happens out-of-band until
an admin-role system exists (post-beta).

Also verified: `profile_id` always comes from the verified session (never the
client), match ids are checked against the caller's own `matches` rows (demo
fixtures excepted), the diagnostics allow-list and secret/token-shaped value
rejection remain enforced, coaching verdicts remain validated, and the 60s
duplicate window is unchanged.

## Feedback UI

Sprint 5.9 shadcn `Select` migration kept as-is. Exactly one free-text field
(`Textarea#report-description`); the DB `title` is still derived by
`deriveTitle()`. No summary/title input exists anywhere in the dialog.

## Dependencies (verify only)

Resolved through the tree with the existing `overrides` (bun):
`brace-expansion 1.1.18`, `nanoid 3.3.18`, `postcss 8.5.26`, `js-yaml 4.3.1`,
`@babel/core 7.29.7`, `esbuild 0.28.2`. No further upgrades applied.

## Password security

Leaked-password (HIBP) protection verified enabled through the supported auth
configuration path. No custom breach checking exists.

## Riot timeline

Unchanged. Riot timeline → `matches.timeline` → `readStoredTimeline` →
`MatchAnalysisInput.timeline` → power-spike analysis still verified by the
Sprint 5.6 suite (18/18), including reuse, failure cooldown, 429 handling and
malformed/not-found degradation. No backfill job added.

## Test results

coaching 49/49 · decision-chain 31/31 · beta-readiness 16/16 ·
5.4 hardening 21/21 · 5.5 authenticated 20/20 · 5.6 timeline 18/18 ·
5.7 account security 37/37 · 5.8 feedback 42/42 · 5.9 MFA+feedback 42/42 ·
typecheck clean · production build succeeds.

## Classification

- **TRUE BETA BLOCKER** — none in application code.
- **WARNING / SHOULD FIX BEFORE PRIVATE BETA** — report triage is manual;
  email auto-confirm is on (fine for invite-only beta, revisit for public).
- **EXTERNAL CONFIGURATION REQUIRED** — SMS gateway + phone auth for SMS MFA;
  production Riot API credentials (development configuration intentionally
  untouched, credentials remain server-side).
- **SAFE TO DEFER POST-BETA** — admin triage dashboard, reviewer comments,
  email as a second factor (not offered by the provider), monetization.

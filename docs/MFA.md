# Optional TOTP MFA — how it works and how to recover

Provider: Lovable Cloud auth native MFA (TOTP). No custom OTP, no recovery codes
(the provider does not issue them; none are invented).

## Enforcement layers
1. UI: root authenticated-surface boundary, app-shell and /auth render
   `MfaChallenge` for enrolled aal1 sessions or unknown security status.
   Profile hydration waits until native MFA is resolved; provider calls are
   deferred outside auth event callbacks to avoid SDK lock deadlocks.
   Recovery and public legal notices remain reachable. Unknown status offers retry/sign-out.
2. Server functions: every protected function (Riot, profile, matches, coaching,
   feedback, entitlements, billing checkout/portal/subscription) uses
   `requireVerifiedSession` → rejects aal1 tokens for enrolled users.
3. Database: RESTRICTIVE RLS policy "Require MFA when enrolled" on profiles,
   riot_accounts, matches, coaching_analyses, coaching_report_grants,
   feedback_reports, subscriptions, user_entitlements via
   `public.session_meets_mfa()`. Blocks direct browser writes/reads too.
   Avatar storage also uses a restrictive MFA policy, preserving per-user paths.
   Not covered: beta_events (analytics) or user_roles (self-readable role catalog).
   Existing signed avatar URLs remain valid until expiry; MFA cannot revoke an already-issued URL.
   Note: MCP OAuth tokens are aal1, so enrolled users' MCP tools return no data.

## Disable
Settings → Security → Turn off requires a fresh authenticator code
(native challenge/re-verification) before the exact factor is unenrolled.
Other factors are never removed as part of this action. Native session refresh
follows removal. Cancellation only removes an unverified TOTP enrollment.
Setup clears only abandoned unverified TOTP factors, never verified protection.
No SMS or email second-factor enrollment is offered.

## Lost authenticator (admin procedure)
No self-service recovery. Requests go to botdiffgg@gmail.com. NEEDS OWNER REVIEW:
approve and document identity-verification criteria; a matching email address
alone is not sufficient proof. Never request passwords, authenticator codes or
setup keys by email. Once identity is verified through the approved procedure,
an authorized operator may remove only the intended native factor through a
supported Cloud admin interface/API. Verify the available admin interface before
promising recovery; it has not been exercised. The app exposes no admin removal endpoint.
User then signs in with password/Google and re-enrolls. Password reset itself
does not bypass or disable an existing authenticator.

## Manual tests still required
Enroll with a real authenticator app; sign out/in and pass challenge; wrong and
expired code rejected; refresh during challenge; Google sign-in with MFA;
password reset link with MFA (recovery session is aal1 → challenge shown);
turn off with code; checkout/portal after challenge.

## Editor verification — 22 October 2026
- 10 native-wrapper regression tests, 37 account-security checks and 30 MFA/feedback
  checks pass. Five existing billing-state tests pass. Automatic typecheck/build is clean.
- Signed-in desktop/mobile Security renders only authenticator setup and surfaces
  enrollment failures without claiming protection is enabled. No factor was created
  or changed on the verification account (confirmed from native factor inventory).
- End-to-end enrollment is BLOCKED for the automatically minted verification session:
  native `/factors` returns HTTP 500: "A valid session and a registered user are
  required to enroll a factor". The minted token lacks `session_id`; its user read
  succeeds, but that is insufficient for native enrollment. Do not change provider
  configuration or weaken MFA to bypass this test-session limitation.
- Next verification requires an ordinary email/password or Google sign-in inside
  the editor, followed by QR enrollment, incorrect/expired codes, new-session
  challenge, reload, OAuth/recovery, sensitive operations and secure removal.
  Hosted TOTP configuration and full native flow remain unverified, not declared working.
- Migration 0004 adds avatar MFA policy to the shared Cloud database now; no app
  publication or live-billing change was performed. Production launch still needs
  the manual checks above plus the legal/billing prepublication checklist.

## Files changed for native completion
`src/components/mfa-settings.tsx`, `src/components/mfa-challenge.tsx`,
`src/hooks/use-auth.tsx`, `src/hooks/use-entitlements.tsx`, `src/routes/auth.tsx`,
`src/routes/__root.tsx`, `src/lib/security/mfa.ts`, `mfa-factors.ts`,
`account-security.functions.ts`, `account-security.server.ts`, `mfa.test.ts`,
`src/lib/coaching/coaching-validation-v1/mfa-feedback-5-9.ts`,
`drizzle/migrations/0004_enforce_avatar_mfa.sql`, `AGENTS.md`, `roadmap.md`, this document.

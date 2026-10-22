# Optional TOTP MFA — how it works and how to recover

Provider: Lovable Cloud auth native MFA (TOTP). No custom OTP, no recovery codes
(the provider does not issue them; none are invented).

## Enforcement layers
1. UI: app-shell and /auth render `MfaChallenge` while the provider reports
   currentLevel aal1 / nextLevel aal2 (survives refresh, new tabs).
2. Server functions: every protected function (Riot, profile, matches, coaching,
   feedback, entitlements, billing checkout/portal/subscription) uses
   `requireVerifiedSession` → rejects aal1 tokens for enrolled users.
3. Database: RESTRICTIVE RLS policy "Require MFA when enrolled" on profiles,
   riot_accounts, matches, coaching_analyses, coaching_report_grants,
   feedback_reports, subscriptions, user_entitlements via
   `public.session_meets_mfa()`. Blocks direct browser writes/reads too.
   Not covered: beta_events (analytics), avatar storage bucket.
   Note: MCP OAuth tokens are aal1, so enrolled users' MCP tools return no data.

## Disable
Settings → Security → Turn off requires a fresh authenticator code
(re-verification) before the factor is unenrolled.

## Lost authenticator (admin procedure)
No self-service recovery. Owner verifies identity out-of-band (reply from the
account email to botdiffgg@gmail.com), then removes the user's verified factor
from Lovable Cloud → Users (or via admin API `auth.admin.mfa.deleteFactor`).
User signs in with password/Google and may re-enroll.

## Manual tests still required
Enroll with a real authenticator app; sign out/in and pass challenge; wrong and
expired code rejected; refresh during challenge; Google sign-in with MFA;
password reset link with MFA (recovery session is aal1 → challenge shown);
turn off with code; checkout/portal after challenge.

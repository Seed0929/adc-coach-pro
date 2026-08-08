# Sprint 5.7 — Account Security + MFA

Status: COMPLETE (account security only; no coaching, timeline, Riot, analytics
or design changes).

## Existing authentication architecture (audited, not replaced)

- Provider: Supabase Auth (Lovable Cloud). Email + password, Google via the
  Lovable OAuth broker, password recovery, persisted refreshing session.
- Client session state: `src/hooks/use-auth.tsx` (`onAuthStateChange` first,
  then session hydration; profile row ensured under RLS).
- Signup/login/recovery UI: `src/routes/auth.tsx`; recovery completion at
  `src/routes/reset-password.tsx` (`updateUser({ password })`).
- Routes are browsable as a guest with demo data; **real data is gated
  server-side** by `createServerFn` + provider-validated bearer token + RLS
  (`profile_id = auth.uid()`), not by frontend guards.
- Riot linking: `linkRiotAccount` server fn resolves the PUUID server-side;
  the Riot API key never leaves the server.

## MFA implementation

Native provider MFA (Supabase Auth **TOTP**, authenticator app). No custom
crypto, no client-generated codes, no stored secrets, no local flags.

- `src/lib/security/mfa-policy.ts` — pure rules (assurance from claims,
  enabled-derivation, challenge derivation, the authorization rule).
- `src/lib/security/mfa.ts` — thin wrappers over `supabase.auth.mfa`
  (`enroll`, `challengeAndVerify`, `unenroll`, `listFactors`, AAL).
- `src/lib/security/account-security.server.ts` — server-only truth: verified
  factors via the provider admin API; `assertSessionAssurance` fails closed.
- `src/lib/security/require-verified-session.ts` — extends the generated
  `requireSupabaseAuth`; rejects any `aal1` request from an MFA-enrolled user.
- `src/lib/security/account-security.functions.ts` — `getAccountSecurityStatus`
  returns only `mfaEnabled`, `verifiedFactorCount`, `assuranceLevel`,
  `challengeRequired`. Never secrets or recovery material.

### Enrollment

Authenticated user → provider `enroll` (factor **unverified**) → setup key
shown once → 6-digit code → provider verifies → factor becomes verified → MFA
enabled. A failed code leaves the factor unverified; MFA stays off. Cancelling
unenrolls the in-progress factor.

### Login

No MFA: login → session → app. MFA on: login → provider requires `aal2` →
challenge screen (`src/components/mfa-challenge.tsx`) → successful verification
→ app. Failure keeps the session at `aal1`; `/auth` does not navigate onward and
every protected server function rejects the request.

### Disable

Supported: every verified factor is unenrolled through the provider (which
requires an `aal2` session), then status is re-read from the server.

### SMS

Not fabricated. TOTP is the strongest natively available method here. SMS would
require a production SMS provider configured on the auth project; the policy and
status layers are factor-type agnostic, so adding a phone factor later needs no
architectural change.

## Session, bypass and isolation findings

- MFA status is always re-derived from the provider (refresh, new tab, tampered
  localStorage, stale client state all re-resolve correctly).
- The gate lives in server middleware, so direct URL navigation, client-state
  edits or replayed `aal1` tokens cannot reach protected data.
- Unknown/absent/malformed `aal` claims degrade to `aal1` (fail closed); an
  unreadable enrollment state rejects the request.
- Sign-out clears session, profile and MFA state and returns to `/auth`.
- Data isolation unchanged and re-verified: user id always comes from the
  verified token, never from request data; RLS policies scope every table to
  `auth.uid()`; no cross-user read path was found.
- Riot chain intact: authentication → verified linking → `riot_connected`
  gating → sync. MFA only adds an assurance requirement in front of it.

## Password recovery

Unchanged behaviour. The recovery link yields a recovery session that can only
set a new password; it does not remove factors or elevate assurance, so an
MFA-enrolled account still owes its challenge after a reset, and protected data
stays unreachable until then.

## Tests

`src/lib/coaching/coaching-validation-v1/account-security-5-7.ts` — 37/37 PASS
(assurance derivation, MFA status derivation, authorization rule, server gate
incl. fail-closed, gating of all protected server functions, user-scoped
queries, secret hygiene, session/challenge/recovery behaviour).

Regression: 5.4 21/21, 5.5 20/20, 5.6 18/18, coaching 49/49, beta readiness
16/16, typecheck clean.

## Still required / limitations

- Manual test required: real enrollment + challenge in a signed-in browser with
  an authenticator app (no injected session available this sprint).
- SMS MFA requires production SMS configuration.
- Production Riot API key remains pending; Riot configuration untouched.
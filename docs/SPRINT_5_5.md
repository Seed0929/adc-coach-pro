# Sprint 5.5 — Authenticated Private Beta Validation V1

Status: PASS (validated deterministically; live signed-in browser run unavailable)

## Scope
Validate the ACTUAL authenticated journey. No UI redesign, no new features, no
change to coaching intelligence.

## Audit findings (real defects, both fixed)
1. **Gating mismatch** — `use-match-report.ts` gated real reports on
   `onboarding_complete` while `use-match-history` / `use-sync` gate on
   `riot_connected`. An account that finished onboarding but never linked Riot
   requested real reports that could not exist. Now gated on `riot_connected`.
2. **Riot link bypass in Settings** — `settings.profile.tsx` upserted
   `riot_accounts` directly, so the PUUID was never resolved and the connected
   flags were set without verification. It now calls the same
   `linkRiotAccount` server function onboarding uses.

## Security / data isolation (verified by inspection)
- Every `*.functions.ts` server function uses `requireSupabaseAuth`; ownership
  comes from `context.userId`, never from client input.
- `matches.server.ts` / `coaching.server.ts` scope all reads and writes by
  `profile_id`. RLS policies scope every table to `auth.uid()`.
- Riot API key and the service-role client live only in `*.server.ts`.

## Validation suite
`src/lib/coaching/coaching-validation-v1/authenticated-5-5.ts` — 20/20 pass:
real (non-demo) match ids produce real reports, Decision Chain V1 reaches the
report, "Why This Coaching" always has what happened / why it mattered,
counterfactuals stay directional with stated confidence, habit notes are
withheld until a habit recurs, the practice handoff uses the single Practice
Planner contract, first-sync and empty-history states never fabricate a chain,
reloads are byte-identical, no developer terminology reaches the player, and a
failing analytics transport can never gate coaching.

Regression: Sprint 5.4 hardening suite 21/21 still passes; typecheck clean.

## Not verified
No signed-in session was available in this environment, so the live browser
walkthrough (real Riot sync → dashboard → match report → practice loop) is
UNVERIFIED. Everything above is deterministic code-level validation.

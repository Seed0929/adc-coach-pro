# Sprint 5.8 — Bug Report + Feedback System

Status: Complete · Scope: pre-beta backend + minimum UI · No redesign, no new coaching logic

## Goal

Private beta users can report problems from inside BotDiff, with enough automatic
context that we can reproduce an issue without asking them technical questions.

## What was built

### Database

`public.feedback_reports` with enums `feedback_report_type`
(`bug`, `coaching_feedback`, `incorrect_data`, `ui_issue`, `feature_request`, `other`)
and `feedback_report_status` (`new`, `reviewing`, `resolved`, `closed`).

Columns: `profile_id`, `report_type`, `title`, `description`, `status`, `route`,
`feature`, `match_id`, `coaching_verdict`, `diagnostics` (JSONB), `created_at`,
`updated_at`.

RLS (grants issued in the same migration):

- SELECT — `profile_id = auth.uid()` (owner only).
- INSERT — `profile_id = auth.uid() AND status = 'new'`; a client can never
  create a report as another user or self-assign a triage status.
- No UPDATE/DELETE policy: reports are immutable from the app.

### Policy layer — `src/lib/feedback/feedback-policy.ts`

Pure, I/O-free rules so they can be asserted deterministically:

- Report types, statuses, and the five coaching verdicts (`coaching_wrong`,
  `advice_unclear`, `evidence_mismatch`, `actually_good_decision`,
  `not_my_biggest_issue`) with player-friendly labels.
- `validateReport` — required type, title ≥ 4 chars (capped 120), description
  ≥ 10 chars (capped 4000), match-id shape check, verdict allow-list. Status and
  owner fields supplied by a client are ignored, never forwarded.
- `sanitizeDiagnostics` — allow-list (`route`, `feature`, `appVersion`,
  `buildMode`, `userAgent`, `language`, `platform`, `viewport`, `timezone`,
  `isDemo`, `submittedAt`). Any other key is dropped, and even allowed keys are
  discarded when the value looks like a token/key/password/OTP URI. No storage,
  cookie, or session material is collected client-side.
- `isDuplicateSubmission` — identical type+title+description within 60s.

### Server layer

- `feedback.server.ts` — `createReport` / `listReports` through the caller's
  RLS-scoped client (never the service role). `resolveMatchId` verifies an
  attached match belongs to the caller (`profile_id = auth.uid()`), allowing
  public `demo-*` fixtures; anything else is rejected as `invalid_match`.
  Read/write failures throw so nothing is ever reported as saved when it wasn't.
- `feedback.functions.ts` — `submitFeedbackReport` and `listMyFeedbackReports`,
  both gated by `requireVerifiedSession` (Sprint 5.7 assurance middleware).
  Owner comes from the verified token subject.

### UI (minimum required)

- `src/components/feedback-dialog.tsx` — type picker, coaching-verdict picker
  (only for coaching feedback), summary, description, optional "attach the match
  I'm viewing". Submits once (in-flight guard + disabled button), keeps the
  user's text on failure, confirms on success.
- `src/components/feedback-settings.tsx` — Settings entry point plus the user's
  own report list with status.
- `src/routes/matches.$matchId.tsx` — "Report Issue" on the match report,
  pre-filled with that match id and defaulting to coaching feedback.

## Testing

`bun run src/lib/coaching/coaching-validation-v1/feedback-5-8.ts` — **42/42 PASS**
(types/status model, validation, diagnostics allow-listing, duplicate window,
match-ownership enforcement, DB failure handling, authorization placement,
entry points).

Regressions all green: 5.4 21/21, 5.5 20/20, 5.6 18/18, 5.7 37/37,
coaching 49/49, decision chain 31/31, beta readiness 16/16. Typecheck clean.
Browser-verified the Settings entry point and dialog render.

## Notes / not in scope

- No admin triage surface: status transitions are done outside the app for now
  (no UPDATE policy exists, deliberately).
- Attachments/screenshots were not added; diagnostics cover the common cases.
# BotDiff legal foundation — DRAFT / NEEDS OWNER REVIEW

**Not published. Not adopted legal policies. No live billing activation.**
These drafts describe inspected implementation, not verified provider contracts or legal advice. No legal identity, email, street address, retention deadline, effective date, jurisdiction, refund window or waiver was invented. The owner operates personally as a sole proprietor, not an LLC.

## Publication and paid-launch blockers

- [ ] **NEEDS OWNER REVIEW — operator:** supply verified legal name and real privacy, deletion and billing contact channels; address only if applicable requirements call for it. Do not substitute a fictional company.
- [ ] **NEEDS OWNER REVIEW — applicability:** obtain qualified review of jurisdictions, eligibility/children, lawful bases, data rights, international transfers, consumer rights, dispute provisions and liability terms. Drafts make no universal rights promises or blanket waivers.
- [ ] **NEEDS OWNER REVIEW — processors:** verify Lovable Cloud/hosting/auth/storage contracts, processing regions, subprocessors, security and operational log/backup policies; Google OAuth and fonts; Riot Data Dragon and CommunityDragon requests; Stripe integration including managed-payments merchant/tax responsibilities and fees. Do not rely on the earlier unverified US-business assumption.
- [ ] **NEEDS OWNER REVIEW — retention:** define a real per-category schedule and operational process for auth, profiles/images, raw matches/other participants, timelines, analyses, grants, roles/entitlements, feedback, beta events, subscriptions, logs, backups and external copies. No complete purge schedule found.
- [ ] **NEEDS OWNER REVIEW — deletion:** supply a real request channel and verified procedure. No full self-service deletion, auth-user deletion endpoint or request service was found. Cascades are not a complete erasure process. Test storage files, signed URL invalidation, external providers, backups and connected-assistant authorization; define lawful exceptions and timing.
- [ ] **NEEDS OWNER REVIEW — tracking:** inventory actual deployed storage/cookies/requests, including hosting, OAuth and Stripe. Classify account-linked journey analytics and determine consent/opt-out requirements. No in-app analytics opt-out; no banner or marketing tracking added in this task. Do not claim every storage item is essential.
- [ ] **NEEDS OWNER REVIEW — acknowledgment:** email signup's unchecked acknowledgment is client-only, not recorded, versioned or enforceable evidence of acceptance. Direct signup APIs bypass it; existing Google OAuth is intentionally unchanged. If required, design an approved, auditable mechanism across all signup providers before adopting terms.
- [ ] **NEEDS OWNER REVIEW — billing:** approve final refund policy, contact, renewal/tax disclosures, cancellation method and portal configuration. No refund processing, event reconciliation or approved fixed grace period exists. Verify Stripe checkout → webhook → Pro readback and cancellation before launch.
- [ ] **NEEDS OWNER REVIEW — billing security/reliability:** server live checkout checks `BOTDIFF_LIVE_CHECKOUT` but does not also check `PLAN_CONFIG.paymentsEnabled` (the latter gates browser UI). Client-supplied environment/return URL and HTTPS-any-host checkout returns need review. Customer lookup falls back to email and rewrites metadata; use verified immutable ownership mapping. Webhook uses signed subscription metadata for owner association, ignores database errors and has no processed-event ledger/order protection. Upsert by subscription ID prevents duplicate rows, not stale-event regression or silently lost updates. Fix and validate before live approval. **This task audits only; billing code/settings are unchanged.**
- [ ] **NEEDS OWNER REVIEW — privileges/integrity:** verify deployed grants, storage policies and `has_role` callable arguments. Own-row match/analysis writes exist; RLS ownership alone does not establish authentic Riot evidence. Optional MFA server checks do not by themselves establish protection for every direct data API or MCP path.
- [ ] **NEEDS OWNER REVIEW — affiliates:** no program, attribution, commission ledger or payouts implemented. Adopt actual program terms, tax/reversal/payout practices and FTC/platform/non-US disclosures before enrollment. No invented rates or payout promises.
- [ ] **NEEDS OWNER REVIEW — Riot:** verify production API approval and developer-policy/asset compliance; preserve Free Riot access and full non-endorsement statement. No API-key changes made.
- [ ] **NEEDS OWNER REVIEW — adoption:** approve final document versions/effective dates, replace unresolved sections with verified facts and remove draft/noindex status only when appropriate. Do not publish as final merely because the pages render.
- [ ] **Separate paid launch:** explicit owner approval AND Riot production approval required. This task does not publish, change secrets, enable checkout or process a test payment.

## Inspected facts and source map

| Area | Evidence | What is implemented / limits |
| --- | --- | --- |
| Auth/profile | `src/hooks/use-auth.tsx`, `src/integrations/supabase/client.ts`, `previewAuthStorage.ts`, `src/routes/settings.profile.tsx` | Email/password and Google flows; profiles separate from Riot; persistent auth; UI acknowledgment not stored. Hosted signup settings unverified. |
| Images | `src/lib/avatar.ts` | User-folder uploads and ~10-year signed URLs. Lifetime is link validity, NOT a retention policy; upload can precede profile save. Old-file cleanup and privacy deserve review. |
| Riot/matches | `src/lib/riot.server.ts`, `src/lib/matches.server.ts`, `src/lib/match-timeline.server.ts`, `src/lib/coaching.server.ts` | Server Riot requests, original match responses (including other participants), normalized timelines, stored analyses. |
| AI | `src/lib/coaching/ai-provider.server.ts`, `src/lib/coaching.functions.ts` | Optional OpenAI module exists; `resolveCoachProvider` has no reachable caller found. Do NOT describe OpenAI transfers as active. Update privacy before connecting it; contracts/training/retention unknown. No chatbot added. |
| Feedback | `src/lib/feedback/feedback.functions.ts`, `feedback.server.ts`, `feedback-policy.ts`, `client-context.ts` | Caller-scoped submission and match ownership checks; limited sanitized diagnostics and free text; admin review. No complete deletion channel. |
| Analytics | `src/lib/analytics/beta-events.ts`, `beta-analytics.ts`, `supabase-transport.ts`, `src/routes/__root.tsx` | Signed-in events with profile/session IDs, event/stage/time and allowed detail keys: surface/reason/count/demo/degraded. Guest transport drops events. Unknown keys filtered; no opt-out. |
| Storage/cookies | `src/hooks/use-theme.tsx`, `src/lib/league-data/cache.ts`, `previewAuthStorage.ts`, `src/components/ui/sidebar.tsx` | Local storage for auth/theme/public asset cache; session ID in session storage. Sidebar utility cookie code has no active caller found in current shell, so not disclosed as an active cookie. Hosted cookies unverified. |
| Diagnostics | `src/lib/lovable-error-reporting.ts`, `src/lib/error-capture.ts`, `src/routes/__root.tsx` | Root errors can be sent to available Lovable telemetry with pathname/context; server errors logged. Provider logging/retention unverified. |
| Assistants | `src/lib/mcp/index.ts`, `supabase.ts`, `tools/*`, `src/routes/[.]lovable.oauth.consent.tsx` | OAuth-authorized read-only account/match tools, caller RLS. Authorization does not equal privacy/analytics consent; receiving-service policies need review. |
| Stripe | `src/lib/billing/billing.functions.ts`, `billing-status.ts`, `src/lib/stripe.server.ts`, `src/lib/stripe.ts`, `src/routes/api/public/payments/webhook.ts`, `src/components/pro/plan-settings.tsx` | Test checkout/portal scaffold, signature verification, subscription rows; paid launch off by policy/UI. Live guard discrepancy and incomplete end-to-end validation noted above. |
| Database | Read-only inspection of current `pg_policies` during this task; `drizzle/migrations/0001_harden_privilege_grants.sql`, `0002_create_subscriptions.sql` and existing `supabase/migrations` | All 11 inspected public application tables have RLS enabled. Account-linked reads scoped by user ID; subscriptions/entitlements/roles/report grants have own-read policies, feedback has admin review policies. Hosted storage/auth settings and full grants not verified. No schema changes in this task. |

## New foundation and integration files

- `src/routes/privacy.tsx`, `terms.tsx`, `cookies.tsx`, `refunds.tsx`, `disclaimer.tsx`, `data-deletion.tsx`, `affiliate-terms.tsx`: public draft pages with individual metadata and noindex.
- `src/lib/legal/documents.ts`, `route-head.ts`, `src/components/legal-document.tsx`: shared factual content, review markers and accessible responsive presentation.
- `src/components/public-footer.tsx`, `src/routes/auth.tsx`, `src/routes/settings.index.tsx`: legal links and acknowledgment.
- `src/lib/legal/signup-policy.ts`, `signup-policy.test.ts`: email-form-only check and four concrete rules tested.
- `AGENTS.md`, `roadmap.md`: architecture rules and task completion. Test-runner dependency added so tests remain runnable.
- Metadata-only completion in existing content routes: seven `analysis.*` pages, `champions.tsx`, `coach.tsx`, `coaching.tsx`, `coaching.history.tsx`, `dashboard.tsx`, `matches.index.tsx`, `matches.$matchId.tsx`, `profile.index.tsx`, `profile.$champion.tsx`, `profile.tsx`, `progress.tsx`, `reset-password.tsx`, `settings.profile.tsx`, `settings.tsx`, `welcome.tsx`, and OAuth consent. Root-level unrelated preview image tags removed so they do not override leaf-page previews. No URLs, engine behavior, auth gates or billing behavior changed.

## Authoritative reference material for owner review

- FTC Disclosures 101: https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers
- FTC Endorsement Guides questions: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- Riot developer policies: https://developer.riotgames.com/policies/general

## Verification record

- Focused acknowledgment and existing billing-status unit tests: 9 passed.
- Existing feedback validation: 42/42; account security: 37/37; hardening/analytics: 21/21. Total: 109 passing checks.
- All seven public draft URLs returned HTTP 200 and distinct titles/noindex metadata. Desktop/mobile privacy screenshots inspected; signup starts unchecked, requires acknowledgment for email signup, leaves Google enabled and existing sign-in ungated. Signed-in owner's Settings displays five legal links; Data deletion link opens the public draft. No page errors observed. No new account, Google OAuth completion or payment was executed.
- Latest automatic preview build/typecheck: build OK. No manual build/typecheck, publication, live setting change or payment processing in this task. Provider settings and legal sufficiency remain unverified.
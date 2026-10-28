
- MCP server lives in src/lib/mcp (tools read-only, OAuth via Cloud auth, RLS as caller) — keeps agent access scoped to the signed-in player.
- Billing: Pro comes from public.subscriptions rows written only by the signed webhook at src/routes/api/public/payments/webhook.ts; live checkout stays off until BOTDIFF_LIVE_CHECKOUT=true and PLAN_CONFIG.paymentsEnabled — launch requires explicit owner approval.
- Legal documents use shared factual draft content and presentation with separate public leaf routes and noindex metadata; this keeps notices consistent and prevents unfinished policies from being indexed. Review the legal prepublication checklist before adopting or publishing them.
- Signup acknowledgment is an email-form-only UI check, not persisted consent; keep existing OAuth independent until an approved provider-wide consent mechanism exists.
- Public legal contact links use a shared client-safe contact module so every legal page targets the same owner-supplied mailbox without implying automatic request handling.
- Optional TOTP MFA is enforced in three layers (UI challenge, requireVerifiedSession on server functions, restrictive RLS via session_meets_mfa); new user-data tables need the restrictive policy too.
- Resolve native MFA before profile hydration; defer provider calls outside auth event callbacks and reject unknown status with retry/sign-out so SDK locks and failed reads cannot bypass protection.
- Authenticator enrollment secrets stay transient; cancellation only targets unverified factors and disabling targets one verified factor after fresh native verification, preventing accidental removal of other protection.
- Visual panel treatment uses shared glass tokens/utilities and shell-scoped inset styling over a bundled decorative image; use non-layout-changing edges and parent blur for inset panes so theme refinements preserve geometry, content and behavior.

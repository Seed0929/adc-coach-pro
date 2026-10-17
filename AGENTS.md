
- MCP server lives in src/lib/mcp (tools read-only, OAuth via Cloud auth, RLS as caller) — keeps agent access scoped to the signed-in player.
- Billing: Pro comes from public.subscriptions rows written only by the signed webhook at src/routes/api/public/payments/webhook.ts; live checkout stays off until BOTDIFF_LIVE_CHECKOUT=true and PLAN_CONFIG.paymentsEnabled — launch requires explicit owner approval.

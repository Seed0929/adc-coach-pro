# Secure Owner Access

An internal access level above Pro, for BotDiff ownership/development accounts.
It is **not** a subscription tier and is never advertised or purchasable.

## How it is stored

Owner lives in exactly one place: a row in `public.user_roles` with
`role = 'owner'` (`app_role` enum). It is keyed on the immutable
`auth.users.id`, so renaming an account, changing an email, or any future
billing event cannot affect it.

Grant owner access to an account (backend / service-role only, no code change):

```sql
insert into public.user_roles (user_id, role)
values ('<auth-user-uuid>', 'owner')
on conflict (user_id, role) do nothing;
```

Revoke:

```sql
delete from public.user_roles where user_id = '<auth-user-uuid>' and role = 'owner';
```

Additional owners are added the same way — no source edits, no deploy.

## How it is enforced

- `loadPlan()` in `entitlements.server.ts` resolves `owner` **before** reading
  any billing plan, via `has_role(uid, 'owner')`. Owner therefore always wins
  and can never be downgraded by plan writes or webhooks.
- `isOwner()` fails closed: any error resolves to "not owner".
- Capabilities are centralized in `plan.ts`. `owner` is *derived* from the Pro
  capability map, so any capability added to Pro in the future unlocks for
  owners automatically.
- `isProOrAbove()` is the single "has premium capabilities" test used by the
  server gate, the dossier gate, and the UI hook.
- Report allowance: owner is unlimited and unmetered — no grants are written.
- Dossier serialization maps owner to `planTier: "pro"` (full depth, no locked
  insights).

## Why the client cannot escalate

- `EntitlementState.plan` is display state only; every premium read is
  re-resolved on the server from the database.
- `setDevPlan` / `writePlan` normalize input to `free` | `pro` only — owner is a
  role, not a plan value, and is not writable through the application at all.
- `user_roles`, `user_entitlements`, and `coaching_report_grants` have **no**
  INSERT/UPDATE/DELETE policies, and those privileges are revoked from
  `authenticated`; `anon` holds no privileges on any table. Writes require the
  service role, which never reaches the browser.
- No owner uuid or email is hard-coded anywhere in the source.

## Customer-facing invisibility

Pricing, upgrade dialogs, locked previews, and the landing page never mention
owner. The only owner-visible marker is an authenticated-only "Owner Access"
line in Settings.

## Database linter note: `has_role` is SECURITY DEFINER

The linter warns that a `SECURITY DEFINER` function is executable by signed-in
users. This is intentional and safe:

- RLS policies must read `user_roles`, which signed-in users may otherwise only
  self-read; the policy expression runs as the caller, so `authenticated`
  requires EXECUTE.
- The function body restricts any authenticated caller to `_user_id = auth.uid()`,
  so it can only confirm the caller's own role and cannot enumerate others.
- EXECUTE is revoked from `PUBLIC` and `anon`.
- `search_path` is pinned to `public`.

## Validation

`bun run src/lib/coaching/coaching-validation-v1/owner-access-5-14.ts` — 20
checks covering capability inheritance, Free/Pro regression, escalation
resistance, unmetered owner reports, database privilege hardening, and
customer-facing invisibility.

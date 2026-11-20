import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { subscriptionGrantsPro } from "./billing-status";

// Opt-in, disposable PostgreSQL only. Never point this suite at Cloud or a player database.
const target = process.env["BOTDIFF_BILLING_TEST_DATABASE_URL"];
const url = target ? new URL(target) : null;
if (url && (url.hostname !== "127.0.0.1" || url.pathname !== "/botdiff_billing_test")) {
  throw new Error("Billing integration tests require a disposable loopback botdiff_billing_test database");
}
const sql = target ? postgres(target, { max: 12, onnotice: () => {} }) : null;
const player = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  user_id: player, stripe_subscription_id: id, stripe_customer_id: "cus_fixture_test",
  product_id: "prod_fixture", price_id: "pro_monthly", status: "active",
  current_period_start: "2026-11-20T00:00:00Z", current_period_end: "2026-12-20T00:00:00Z",
  cancel_at_period_end: false, ...overrides,
});
const access = (value: Record<string, unknown>, now: Date) => subscriptionGrantsPro({
  status: value.status, current_period_end: value.current_period_end,
}, now);
async function apply(id: string, event: string, created: number, overrides: Record<string, unknown> = {}, env = "sandbox") {
  if (!sql) throw new Error("Disposable database required");
  return sql.begin(async tx => {
    await tx`set local role service_role`;
    const result = await tx`select public.apply_billing_subscription(${env},${event},${created},${tx.json(row(id, overrides))}) as result`;
    return result[0]?.result;
  });
}

describe.skipIf(!sql)("real PostgreSQL billing isolation, replay and lifecycle", () => {
  beforeAll(async () => {
    if (!sql) return;
    await sql.unsafe(`
      DROP SCHEMA public CASCADE; CREATE SCHEMA public;
      DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE service_role BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.user_id',true),'')::uuid $$;
      CREATE FUNCTION public.session_meets_mfa() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.aal2',true),'false')='true' $$;
      CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY);
      CREATE TABLE public.user_entitlements(user_id uuid PRIMARY KEY,plan text);
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    `);
    for (const file of ["0002_create_subscriptions.sql", "0005_lock_subscription_writes.sql", "0006_secure_billing_lifecycle.sql"]) {
      await sql.unsafe(readFileSync(`drizzle/migrations/${file}`, "utf8"));
    }
    await sql`insert into public.profiles(id) values (${player}),(${other})`;
    await sql`insert into public.billing_customers(user_id,environment,stripe_customer_id) values
      (${player},'sandbox','cus_fixture_test'),(${player},'live','cus_fixture_live')`;
  });
  afterAll(async () => { await sql?.end(); });

  it("eight concurrent deliveries commit exactly one receipt and one subscription", async () => {
    if (!sql) return;
    const results = await Promise.all(Array.from({ length: 8 }, () => apply("sub_replay", "evt_replay", 100)));
    expect(results.filter(r => r === "applied")).toHaveLength(1);
    expect(results.filter(r => r === "duplicate")).toHaveLength(7);
    const counts = await sql`select (select count(*)::int from public.subscriptions where stripe_subscription_id='sub_replay') as subs,
      (select count(*)::int from public.billing_webhook_receipts where event_id='evt_replay') as receipts`;
    expect(counts[0]).toMatchObject({ subs: 1, receipts: 1 });
  });
  it("old events cannot overwrite a newer committed state", async () => {
    if (!sql) return;
    await apply("sub_order", "evt_new", 200, { status: "unpaid" });
    expect(await apply("sub_order", "evt_old", 199)).toBe("stale");
    const result = await sql`select status from public.subscriptions where stripe_subscription_id='sub_order'`;
    expect(result[0]?.status).toBe("unpaid");
  });
  it("failure downgrades, recovery restores, and renewal extends the verified end", async () => {
    if (!sql) return;
    const now = new Date("2026-12-19T00:00:00Z");
    for (const [status, created, grants] of [["past_due", 300, true], ["unpaid", 301, false], ["active", 302, true]] as const) {
      await apply("sub_recovery", `evt_recovery_${created}`, created, { status });
      const result = await sql`select status,current_period_end::text from public.subscriptions where stripe_subscription_id='sub_recovery'`;
      expect(access(result[0], now)).toBe(grants);
    }
    await apply("sub_recovery", "evt_renewal", 303, { current_period_end: "2027-01-20T00:00:00Z" });
    const result = await sql`select status,current_period_end::text from public.subscriptions where stripe_subscription_id='sub_recovery'`;
    expect(access(result[0], new Date("2026-12-21T00:00:00Z"))).toBe(true);
    expect(access(result[0], new Date("2027-01-20T00:00:00Z"))).toBe(false);
  });
  it("annual state uses pro_yearly and the actual full year end", async () => {
    if (!sql) return;
    await apply("sub_annual", "evt_annual", 400, { price_id: "pro_yearly", current_period_end: "2027-11-20T00:00:00Z" });
    const result = await sql`select price_id,status,current_period_end::text from public.subscriptions where stripe_subscription_id='sub_annual'`;
    expect(result[0]?.price_id).toBe("pro_yearly");
    expect(access(result[0], new Date("2027-11-19T00:00:00Z"))).toBe(true);
    expect(access(result[0], new Date("2027-11-20T00:00:00Z"))).toBe(false);
  });
  it("canceled subscription cannot resurrect, and expires exactly at period end", async () => {
    if (!sql) return;
    await apply("sub_cancel", "evt_cancel", 500, { status: "canceled", cancel_at_period_end: true });
    expect(await apply("sub_cancel", "evt_resurrect", 501)).toBe("stale");
    const result = await sql`select status,current_period_end::text from public.subscriptions where stripe_subscription_id='sub_cancel'`;
    expect(access(result[0], new Date("2026-12-19T23:59:59Z"))).toBe(true);
    expect(access(result[0], new Date("2026-12-20T00:00:00Z"))).toBe(false);
  });
  it("untrusted ownership and cross-environment mappings roll back without receipts", async () => {
    if (!sql) return;
    await expect(apply("sub_wrong", "evt_wrong", 600, { user_id: other })).rejects.toThrow("ownership");
    await expect(apply("sub_wrong", "evt_cross", 601, {}, "live")).rejects.toThrow("ownership");
    const result = await sql`select count(*)::int as count from public.billing_webhook_receipts where event_id in ('evt_wrong','evt_cross')`;
    expect(result[0]?.count).toBe(0);
  });
  it("competing cycle reservations serialize rather than allow two checkouts", async () => {
    if (!sql) return;
    const reserve = (cycle: string) => sql.begin(async tx => {
      await tx`set local role service_role`;
      return tx`select * from public.reserve_billing_checkout(${other},'sandbox',${cycle})`;
    });
    const results = await Promise.allSettled([reserve("monthly"), reserve("annual")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  });
  it.each(["anon", "authenticated"])("%s cannot write billing tables or execute trusted RPCs", async role => {
    if (!sql) return;
    for (const table of ["subscriptions", "user_entitlements", "billing_customers", "billing_webhook_receipts"]) {
      for (const command of [`delete from public.${table}`, `update public.${table} set ${table === "user_entitlements" ? "plan=plan" : table === "subscriptions" ? "status=status" : "environment=environment"}`, `insert into public.${table} default values`, `truncate public.${table}`]) {
        await expect(sql.begin(async tx => { await tx.unsafe(`set local role ${role}`); await tx.unsafe(command); })).rejects.toThrow("permission denied");
      }
    }
    await expect(sql.begin(async tx => { await tx.unsafe(`set local role ${role}`); return tx`select public.reserve_billing_checkout(${player},'sandbox','monthly')`; })).rejects.toThrow("permission denied");
    await expect(sql.begin(async tx => { await tx.unsafe(`set local role ${role}`); return tx`select public.apply_billing_subscription('sandbox','evt_attack',700,${tx.json(row('sub_attack'))})`; })).rejects.toThrow("permission denied");
  });
  it("own-row SELECT requires MFA and cannot read another player's rows", async () => {
    if (!sql) return;
    const read = (id: string, aal2: string) => sql.begin(async tx => {
      await tx`set local role authenticated`;
      await tx`select set_config('test.user_id',${id},true),set_config('test.aal2',${aal2},true)`;
      return tx`select user_id from public.subscriptions`;
    });
    expect(await read(player, "false")).toHaveLength(0);
    expect(await read(other, "true")).toHaveLength(0);
    const own = await read(player, "true");
    expect(own.length).toBeGreaterThan(0);
    expect(own.every(r => r.user_id === player)).toBe(true);
  });
});
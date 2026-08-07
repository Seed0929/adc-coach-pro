// ---------------------------------------------------------------------------
// Sprint 5.4 — default beta-analytics transport (browser only).
//
// Writes journey events to `beta_events` for the signed-in player only. Guests
// are dropped silently: there is nothing to observe and nothing to store.
// Every failure path is swallowed — the tracker already treats this as
// best-effort, and coaching must never depend on it.
// ---------------------------------------------------------------------------
import { supabase } from "@/integrations/supabase/client";
import { configureBetaAnalytics } from "./beta-analytics";
import type { BetaEventRecord } from "./beta-events";

let installed = false;

async function send(record: BetaEventRecord): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;
    await supabase.from("beta_events").insert({
      profile_id: userId,
      session_id: record.sessionId,
      event_name: record.name,
      stage: record.stage,
      detail: { ...record.detail },
    });
  } catch {
    // Ignored on purpose.
  }
}

/** Install once at app start. Safe to call repeatedly. */
export function installBetaAnalytics(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    configureBetaAnalytics((record) => void send(record));
  } catch {
    // Never block startup.
  }
}

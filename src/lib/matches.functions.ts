import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RiotError } from "./riot.server";
import {
  readStoredMatches,
  syncMatchesForUser,
  type StoredMatch,
} from "./matches.server";

// ---------------------------------------------------------------------------
// Match history server functions. Thin wrappers over matches.server.ts.
// ---------------------------------------------------------------------------

export type { StoredMatch };

export type MatchesResult =
  | { ok: true; matches: StoredMatch[]; imported?: number }
  | { ok: false; code: RiotError["code"]; message: string };

function toResultError(err: unknown): MatchesResult {
  if (err instanceof RiotError) return { ok: false, code: err.code, message: err.message };
  return { ok: false, code: "unknown", message: "Something went wrong. Please try again." };
}

/** Return the user's stored matches (most recent first). No Riot calls. */
export const getStoredMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchesResult> => {
    const { supabase, userId } = context;
    try {
      const matches = await readStoredMatches(supabase, userId);
      return { ok: true, matches };
    } catch (err) {
      return toResultError(err);
    }
  });

/** Import the user's 20 most recent matches from Riot; idempotent upsert. */
export const syncMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchesResult> => {
    const { supabase, userId } = context;
    try {
      const imported = await syncMatchesForUser(supabase, userId, 20);
      const matches = await readStoredMatches(supabase, userId);
      return { ok: true, matches, imported };
    } catch (err) {
      return toResultError(err);
    }
  });

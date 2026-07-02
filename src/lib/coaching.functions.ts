import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeAndStoreMatches } from "./coaching.server";
import {
  summarizeCoaching,
  buildDemoCoaching,
  type CoachingSummary,
} from "./coaching-engine";

// ---------------------------------------------------------------------------
// Coaching analysis server function.
//
// Thin wrapper over `analyzeAndStoreMatches` (coaching.server.ts): loads the
// user's stored Riot matches, computes + persists any missing analyses, and
// returns a summarized coaching report. Match import + analysis also runs
// automatically during sync, so this usually reads straight from cache.
// ---------------------------------------------------------------------------

export type CoachingResult =
  | { ok: true; summary: CoachingSummary }
  | { ok: false; code: string; message: string };

/** Load (or compute + store) the signed-in user's coaching analysis. */
export const getCoachingAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CoachingResult> => {
    const { supabase, userId } = context;
    try {
      const analyses = await analyzeAndStoreMatches(supabase, userId);
      if (analyses.length === 0) {
        return { ok: false, code: "no_matches", message: "No matches to analyze yet." };
      }
      return { ok: true, summary: summarizeCoaching(analyses, false) };
    } catch {
      return {
        ok: false,
        code: "unknown",
        message: "Couldn't build your coaching analysis right now.",
      };
    }
  });

/** Demo coaching used for guests / unlinked accounts. Same shape as live. */
export function demoCoachingSummary(): CoachingSummary {
  return buildDemoCoaching();
}

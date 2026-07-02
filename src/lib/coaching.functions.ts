import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeAndStoreMatches, buildMatchInputs } from "./coaching.server";
import {
  summarizeCoaching,
  buildDemoCoaching,
  buildMatchReport,
  type CoachingSummary,
  type MatchCoachingReport,
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

export type MatchReportResult =
  | { ok: true; report: MatchCoachingReport }
  | { ok: false; code: string; message: string };

/** Build the full AI Coach report for a single match (with trend vs previous). */
export const getMatchReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { matchId: string }) => data)
  .handler(async ({ data, context }): Promise<MatchReportResult> => {
    const { supabase, userId } = context;
    try {
      const inputs = await buildMatchInputs(supabase, userId);
      const idx = inputs.findIndex((i) => i.matchId === data.matchId);
      if (idx < 0) {
        return { ok: false, code: "not_found", message: "That match hasn't been analyzed yet." };
      }
      const prev = inputs[idx + 1] ?? null;
      return { ok: true, report: buildMatchReport(inputs[idx], prev) };
    } catch {
      return { ok: false, code: "unknown", message: "Couldn't build this match's report right now." };
    }
  });

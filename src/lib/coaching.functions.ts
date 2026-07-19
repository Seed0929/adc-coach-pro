import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeAndStoreMatches, buildMatchInputs } from "./coaching.server";
import {
  buildMatchReport,
  analyzeMatch,
  DEMO_INPUTS,
  type MatchCoachingReport,
} from "./coaching-engine";
import { buildCoachDossier, type CoachDossier } from "./player-memory";
import { buildCoachingContext } from "./coaching/context-builder";
import { coachAnswer } from "./coaching";
import type { AnalysisMode } from "./coaching/question-router";

// ---------------------------------------------------------------------------
// Coaching analysis server function.
//
// Thin wrapper over `analyzeAndStoreMatches` (coaching.server.ts): loads the
// user's stored Riot matches, computes + persists any missing analyses, and
// returns a summarized coaching report. Match import + analysis also runs
// automatically during sync, so this usually reads straight from cache.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Coach dossier — the persistent, longitudinal player-memory profile.
// ---------------------------------------------------------------------------

export type CoachDossierResult =
  | { ok: true; dossier: CoachDossier }
  | { ok: false; code: string; message: string };

/** Build the signed-in player's full coaching dossier from cached analyses. */
export const getCoachDossier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CoachDossierResult> => {
    const { supabase, userId } = context;
    try {
      const [inputs, analyses] = await Promise.all([
        buildMatchInputs(supabase, userId, 50),
        analyzeAndStoreMatches(supabase, userId, 50),
      ]);
      if (inputs.length === 0) {
        return { ok: false, code: "no_matches", message: "No matches to analyze yet." };
      }
      return { ok: true, dossier: buildCoachDossier(inputs, analyses, false) };
    } catch {
      return { ok: false, code: "unknown", message: "Couldn't build your coaching profile right now." };
    }
  });

/** Demo dossier for guests / unlinked accounts. Same shape as live. */
export function buildDemoDossier(): CoachDossier {
  const analyses = DEMO_INPUTS.map(analyzeMatch);
  return buildCoachDossier(DEMO_INPUTS, analyses, true);
}

// ---------------------------------------------------------------------------
// Quick Ask — routes a question through the central Coaching Engine and, when
// an OpenAI key is configured, generates a live answer. With no key it returns
// the deterministic, evidence-grounded answer. Either way the architecture is
// identical, so adding the key is the only step needed to go live.
// ---------------------------------------------------------------------------
export type AskCoachResult =
  | { ok: true; answer: string; mode: AnalysisMode; source: "deterministic" | "ai" }
  | { ok: false; code: string; message: string };

export const askCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { question: string }) => data)
  .handler(async ({ data, context }): Promise<AskCoachResult> => {
    const { supabase, userId } = context;
    try {
      const [inputs, analyses] = await Promise.all([
        buildMatchInputs(supabase, userId, 50),
        analyzeAndStoreMatches(supabase, userId, 50),
      ]);
      if (inputs.length === 0) {
        return { ok: false, code: "no_matches", message: "No matches to analyze yet." };
      }
      const dossier = buildCoachDossier(inputs, analyses, false);
      const deterministic = coachAnswer(dossier, data.question);

      // Try live AI; fall back gracefully when no provider / key.
      const { resolveCoachProvider } = await import("./coaching/ai-provider.server");
      const provider = resolveCoachProvider();
      if (provider.available) {
        const ctx = buildCoachingContext(dossier, data.question);
        const ai = await provider.generate(ctx);
        if (ai) return { ok: true, answer: ai, mode: deterministic.mode, source: "ai" };
      }
      return { ok: true, answer: deterministic.answer, mode: deterministic.mode, source: "deterministic" };
    } catch {
      return { ok: false, code: "unknown", message: "Couldn't answer that right now." };
    }
  });

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
      // Sprint 2.2 — pass the older-match window so the decision-chain can
      // recognise recurring wave / objective habits across recent games.
      const history = inputs.slice(idx + 1);
      return { ok: true, report: buildMatchReport(inputs[idx], prev, history) };
    } catch {
      return { ok: false, code: "unknown", message: "Couldn't build this match's report right now." };
    }
  });

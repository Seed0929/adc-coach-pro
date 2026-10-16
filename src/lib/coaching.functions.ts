import { createServerFn } from "@tanstack/react-start";
import { requireVerifiedSession } from "@/lib/security/require-verified-session";
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
import { ensureFullReportAccess, loadPlan } from "./entitlements/entitlements.server";
import { gateDossier } from "./entitlements/gate";
import { getLatestDDragonVersion, championSquareUrl } from "./riot.server";

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

/** A champion the signed-in player actually played, derived from stored Riot matches. */
export interface CoachChampionOption {
  name: string;
  iconUrl: string;
  games: number;
  lastPlayed: string | null;
}

/** What the dossier covers: the whole account, or one champion's games only. */
export interface CoachScope {
  champion: string | null;
  games: number;
  totalGames: number;
  lastPlayed: string | null;
}

export type CoachDossierResult =
  | { ok: true; dossier: CoachDossier; champions: CoachChampionOption[]; scope: CoachScope }
  | { ok: false; code: string; message: string };

/** Build the signed-in player's full coaching dossier from cached analyses. */
export const getCoachDossier = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSession])
  .inputValidator((input: { champion?: string | null } | undefined) => ({
    champion: typeof input?.champion === "string" ? input.champion.trim().slice(0, 40) || null : null,
  }))
  .handler(async ({ data, context }): Promise<CoachDossierResult> => {
    const { supabase, userId } = context;
    try {
      const [allInputs, allAnalyses] = await Promise.all([
        buildMatchInputs(supabase, userId, 50),
        analyzeAndStoreMatches(supabase, userId, 50),
      ]);
      if (allInputs.length === 0) {
        return { ok: false, code: "no_matches", message: "No matches to analyze yet." };
      }

      // Champion pool from the player's own stored matches (newest first).
      const version = await getLatestDDragonVersion();
      const pool = new Map<string, CoachChampionOption>();
      for (const m of allInputs) {
        const hit = pool.get(m.champion);
        if (hit) {
          hit.games += 1;
          if (m.gameCreation && (!hit.lastPlayed || m.gameCreation > hit.lastPlayed)) hit.lastPlayed = m.gameCreation;
        } else {
          pool.set(m.champion, {
            name: m.champion,
            iconUrl: championSquareUrl(version, m.champion),
            games: 1,
            lastPlayed: m.gameCreation,
          });
        }
      }
      const champions = [...pool.values()].sort((a, b) =>
        (b.lastPlayed ?? "").localeCompare(a.lastPlayed ?? ""),
      );

      // Scope to one champion only when the player actually has games on it.
      const selected = data.champion && pool.has(data.champion) ? data.champion : null;
      const inputs = selected ? allInputs.filter((m) => m.champion === selected) : allInputs;
      const ids = new Set(inputs.map((m) => m.matchId));
      const analyses = selected ? allAnalyses.filter((a) => ids.has(a.matchId)) : allAnalyses;
      const scope: CoachScope = {
        champion: selected,
        games: inputs.length,
        totalGames: allInputs.length,
        lastPlayed: selected ? pool.get(selected)!.lastPlayed : (champions[0]?.lastPlayed ?? null),
      };

      // Entitlement gating happens BEFORE serialization, so locked Pro depth
      // never reaches the browser.
      const plan = await loadPlan(supabase, userId);
      return {
        ok: true,
        dossier: gateDossier(buildCoachDossier(inputs, analyses, false), plan),
        champions,
        scope,
      };
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
// Conversational coaching (Quick Ask) is intentionally NOT exposed. The
// deterministic answer engine + context builder remain in the library, dormant
// and unreachable from the customer-facing app, for the future BotDiff Coach.
// ---------------------------------------------------------------------------



export type MatchReportResult =
  | { ok: true; report: MatchCoachingReport }
  | {
      ok: false;
      code: string;
      message: string;
      /** Present when the Free coaching allowance is exhausted. */
      allowance?: { limit: number; resetsAt: string };
    };

/** Build the full AI Coach report for a single match (with trend vs previous). */
export const getMatchReport = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSession])
  .inputValidator((data: { matchId: string }) => data)
  .handler(async ({ data, context }): Promise<MatchReportResult> => {
    const { supabase, userId } = context;
    try {
      const inputs = await buildMatchInputs(supabase, userId);
      const idx = inputs.findIndex((i) => i.matchId === data.matchId);
      if (idx < 0) {
        return { ok: false, code: "not_found", message: "That match hasn't been analyzed yet." };
      }
      // Sprint 5.6 — lazily enrich THIS match with Riot timeline evidence. One
      // Riot request at most (skipped entirely when a timeline is already
      // stored), and any failure leaves the report fully intact.
      try {
        const { getLinkedAccount } = await import("./matches.server");
        const { ensureMatchTimeline } = await import("./match-timeline.server");
        const account = await getLinkedAccount(supabase, userId);
        if (account) {
          const { timeline } = await ensureMatchTimeline(
            supabase,
            userId,
            data.matchId,
            account.region,
          );
          if (timeline) inputs[idx].timeline = timeline;
        }
      } catch {
        /* timeline is enrichment only — never block the report */
      }
      // Free members get the REAL report within their included allowance; a
      // previously unlocked match stays unlocked forever.
      const access = await ensureFullReportAccess(supabase, userId, data.matchId);
      if (!access.allowed) {
        return {
          ok: false,
          code: "plan_limit",
          message: `You've used your ${access.limit} full coaching reports this period.`,
          allowance: { limit: access.limit, resetsAt: access.resetsAt },
        };
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

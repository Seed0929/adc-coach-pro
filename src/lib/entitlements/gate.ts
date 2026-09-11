// ---------------------------------------------------------------------------
// BotDiff — entitlement gating for coaching payloads.
//
// Gating happens on the SERVER before the dossier is serialized, so locked Pro
// content never reaches the browser (no hidden-in-the-DOM premium content).
// What Free members get instead is an honest, non-revealing preview: the
// pattern's area and how many of their own games it appeared in.
//
// Evidence integrity overrides monetization: nothing here invents, rounds or
// embellishes a number. It only removes detail Free members haven't unlocked.
// ---------------------------------------------------------------------------
import type { BillingPlan, LockedInsight } from "./plan";
import { PLAN_CONFIG, isProOrAbove } from "./plan";
import type { CoachDossier, CoachPattern } from "@/lib/player-memory";

function lockedPreview(p: CoachPattern): string {
  const games = p.count === 1 ? "1 of your recent games" : `${p.count} of your recent games`;
  return p.kind === "strength"
    ? `BotDiff detected a recurring ${p.category.toLowerCase()} habit in ${games}.`
    : `BotDiff detected a recurring ${p.category.toLowerCase()} pattern in ${games}.`;
}

function toLocked(patterns: CoachPattern[]): LockedInsight[] {
  return patterns.map((p) => ({ id: p.id, title: p.title, preview: lockedPreview(p) }));
}

/**
 * Trims a dossier down to the Free entitlement.
 *
 * Free keeps everything needed to genuinely experience BotDiff: the full
 * Today's Focus (active priority with evidence, why-it-matters and practice),
 * strengths, weaknesses, trends, consistency and the top recurring patterns.
 * Cross-match depth beyond that — extra patterns, the deeper habit records,
 * champion-specific coaching, the later queue and coaching history — is Pro.
 */
export function gateDossier(dossier: CoachDossier, plan: BillingPlan): CoachDossier {
  // Owner resolves above Pro, so it receives the complete, ungated dossier.
  if (isProOrAbove(plan)) return { ...dossier, planTier: "pro", lockedInsights: [] };

  const keep = PLAN_CONFIG.freeVisiblePatterns;
  const visible = dossier.recurringHabits.slice(0, keep);
  const withheld = dossier.recurringHabits.slice(keep);

  return {
    ...dossier,
    planTier: "free",
    recurringHabits: visible,
    weaknessPatterns: dossier.weaknessPatterns.slice(0, keep),
    strengthPatterns: dossier.strengthPatterns.slice(0, keep),
    // Deep habit records are the Pro cross-match layer.
    habits: [],
    championAdvice: [],
    // Today's Focus + the next priority stay; the rest of the queue is Pro.
    plan: {
      ...dossier.plan,
      queue: dossier.plan.queue.slice(0, 2),
      history: [],
    },
    lockedInsights: toLocked(withheld).slice(0, PLAN_CONFIG.freeLockedPatternPreviews),
    lockedInsightCount: withheld.length,
  };
}

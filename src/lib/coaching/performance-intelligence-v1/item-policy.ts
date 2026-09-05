// ---------------------------------------------------------------------------
// Global item / build recommendation ban.
//
// BotDiff is not a build product. No coaching surface may tell a player what to
// buy, build, rush, swap or "should have purchased" — for any champion, role,
// lane or panel, including inferred alternatives.
//
// What IS allowed: analysis of items the player ACTUALLY purchased, using
// Riot-provided purchase timing, and observations about how they played around
// those real power spikes. That is an observation, not a recommendation.
// ---------------------------------------------------------------------------

/** Imperative or prescriptive build language — always prohibited. */
const RECOMMENDATION_PATTERNS: RegExp[] = [
  /\b(buy|purchase|rush|pick ?up|grab|invest in)\b[^.!?]*\b(item|items|component|boots|ward|zhonya|treads|edge|blade|staff|cloak|armou?r|mr\b|magic resist|anti-?heal|penetration|survivability|defensive)\b/i,
  /\b(should|could|would|might)\s+have\s+(bought|built|purchased|rushed)\b/i,
  /\b(build|itemi[sz]e|itemi[sz]ation)\b[^.!?]*\b(into|toward|first|second|next|path|order|differently)\b/i,
  /\b(build|buy|rush)\s+(anti-?heal|armou?r|magic resist|mr\b|a defensive|defensive)\b/i,
  /\b(defensive|survivability|anti-?heal|anti-?tank|penetration)\s+(item|items|pickup|purchase|buy|option)\b/i,
  /\bitem\s+(recommendation|suggestion|advice|choice)\b/i,
  /\b(swap|switch|change)\b[^.!?]*\bitem\b/i,
  /\bconsider\b[^.!?]*\b(item|boots|anti-?heal)\b/i,
  /\bbuy a\b/i,
  /\bworth considering here\b[^.!?]*\bitem\b/i,
];

/** Purchase-timing observations that remain allowed (no prescription). */
const OBSERVATION_PATTERNS: RegExp[] = [
  /\b(completed|finished|purchased|bought|came online|spiked)\b/i,
];

export function containsItemRecommendation(text: string): boolean {
  if (!text) return false;
  return RECOMMENDATION_PATTERNS.some((re) => re.test(text));
}

/**
 * True for a supported statement about an item the player actually bought.
 * Such statements are observations of Riot data and are intentionally kept.
 */
export function isPurchasedItemObservation(text: string): boolean {
  if (!text) return false;
  if (containsItemRecommendation(text)) return false;
  return OBSERVATION_PATTERNS.some((re) => re.test(text));
}

const sentences = (text: string): string[] => text.split(/(?<=[.!?])\s+/);

/**
 * Remove prohibited build advice sentence-by-sentence, preserving everything
 * else. Returns null when nothing survives, so callers omit the panel rather
 * than showing an empty recommendation.
 */
export function sanitizeCoachingText(text: string): { text: string | null; removed: boolean } {
  if (!text) return { text: null, removed: false };
  const kept = sentences(text).filter((s) => !containsItemRecommendation(s));
  const removed = kept.length !== sentences(text).length;
  const joined = kept.join(" ").replace(/\s{2,}/g, " ").trim();
  return { text: joined.length > 0 ? joined : null, removed };
}

/** Guard for structured coaching entries: drop any item-prescribing item. */
export function withoutItemRecommendations<T>(items: T[], getText: (item: T) => string): T[] {
  return items.filter((i) => !containsItemRecommendation(getText(i)));
}

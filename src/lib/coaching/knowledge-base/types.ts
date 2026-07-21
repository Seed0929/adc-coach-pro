// ---------------------------------------------------------------------------
// BotDiff League Knowledge Base — shared primitive types.
//
// The Knowledge Base stores LEAGUE KNOWLEDGE ONLY. No coaching logic, no
// player evaluation, no opinions. Every entry carries a `source` marker so a
// future Riot Data Dragon integration can swap `curated` → `datadragon`
// without touching the Coach Engine.
// ---------------------------------------------------------------------------

export type KnowledgeSource = "curated" | "datadragon" | "riot-api";

/** Wraps any Knowledge Base record with provenance + patch tracking. */
export interface KnowledgeRecord<T> {
  data: T;
  source: KnowledgeSource;
  patch?: string;
}

export type GamePhase = "early" | "mid" | "late";
export type Rating = "low" | "medium" | "high" | "unknown";

/** Placeholder marker — a field that Data Dragon will hydrate later. */
export const PENDING = "__pending__" as const;
export type Pending = typeof PENDING;

export function isPending<T>(value: T | Pending): value is Pending {
  return value === PENDING;
}
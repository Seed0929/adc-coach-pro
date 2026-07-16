// ---------------------------------------------------------------------------
// Rune Intelligence — factual metadata about rune trees.
// ---------------------------------------------------------------------------
import { RUNE_CATEGORIES, type RuneCategory, type KnowledgeSource } from "../league-knowledge";

export type { RuneCategory, KnowledgeSource };
export { RUNE_CATEGORIES };

export interface RuneTreeMeta {
  category: RuneCategory;
  label: string;
  theme: string;
  source: KnowledgeSource;
}

export function getRuneTree(category: RuneCategory): RuneTreeMeta {
  return { category, ...RUNE_CATEGORIES[category] };
}

export function allRuneTrees(): RuneTreeMeta[] {
  return (Object.keys(RUNE_CATEGORIES) as RuneCategory[]).map(getRuneTree);
}

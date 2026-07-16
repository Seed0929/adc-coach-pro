// ---------------------------------------------------------------------------
// Summoner Spell Intelligence — factual metadata about summoner spells.
// ---------------------------------------------------------------------------
import { SUMMONER_SPELLS, type SummonerSpellId, type KnowledgeSource } from "../league-knowledge";

export type { SummonerSpellId, KnowledgeSource };
export { SUMMONER_SPELLS };

export interface SummonerSpellMeta {
  id: SummonerSpellId;
  label: string;
  use: string;
  source: KnowledgeSource;
}

export function getSummonerSpell(id: SummonerSpellId): SummonerSpellMeta {
  return { id, ...SUMMONER_SPELLS[id] };
}

export function allSummonerSpells(): SummonerSpellMeta[] {
  return (Object.keys(SUMMONER_SPELLS) as SummonerSpellId[]).map(getSummonerSpell);
}

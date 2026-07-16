// ---------------------------------------------------------------------------
// BotDiff League Intelligence Foundation (Sprint 2.0)
//
// The SINGLE factual surface every coaching system consumes before generating
// any coaching. Composed of independent intelligence modules — each provides
// League *facts* only. No coaching logic, no opinions, no player evaluation.
//
//   Coach Engine   →  League Intelligence  →  Facts
//   (Habits, Decisions, Player Memory)      (Champion / Item / Rune / ...)
//
// Every module is pure + client-safe and prepared for a future Riot Data
// Dragon hydration step: consumers already ask through this facade, so the
// data source can change without touching the coach engine.
// ---------------------------------------------------------------------------

export * as ChampionIntel from "./champion";
export * as ItemIntel from "./item";
export * as RuneIntel from "./rune";
export * as SummonerIntel from "./summoner";
export * as ObjectiveIntel from "./objective";
export * as MapIntel from "./map";
export * as MatchupIntel from "./matchup";
export * as PowerSpikeIntel from "./power-spike";
export * as EconomyIntel from "./economy";
export * as TempoIntel from "./tempo";

// Flat re-exports so callers can `import { LeagueIntelligence } from ".../coaching"`.
import * as ChampionIntel_ from "./champion";
import * as ItemIntel_ from "./item";
import * as RuneIntel_ from "./rune";
import * as SummonerIntel_ from "./summoner";
import * as ObjectiveIntel_ from "./objective";
import * as MapIntel_ from "./map";
import * as MatchupIntel_ from "./matchup";
import * as PowerSpikeIntel_ from "./power-spike";
import * as EconomyIntel_ from "./economy";
import * as TempoIntel_ from "./tempo";

/**
 * Namespaced facade. Coach systems should prefer this over reaching into
 * individual modules — it's the contract Data Dragon integration will honor.
 */
export const LeagueIntelligence = {
  Champion: ChampionIntel_,
  Item: ItemIntel_,
  Rune: RuneIntel_,
  Summoner: SummonerIntel_,
  Objective: ObjectiveIntel_,
  Map: MapIntel_,
  Matchup: MatchupIntel_,
  PowerSpike: PowerSpikeIntel_,
  Economy: EconomyIntel_,
  Tempo: TempoIntel_,
} as const;

export type LeagueIntelligenceFacade = typeof LeagueIntelligence;

/**
 * Future Riot Data Dragon hydration entry point. Inert today. When wired,
 * this fans out to each module's own hydration hook — consumers do not need
 * to know which module got refreshed.
 */
export function hydrateLeagueIntelligence(): void {
  // Intentionally empty. See Sprint plan (Data Dragon deferred).
}

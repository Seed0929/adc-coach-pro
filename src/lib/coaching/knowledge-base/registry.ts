// ---------------------------------------------------------------------------
// Knowledge Base Registry — in-memory store for every League fact.
//
// Templates land here (curated today, Data-Dragon-fed tomorrow). The Coach
// Engine reads from these getters ONLY; it never stores League facts itself.
// ---------------------------------------------------------------------------
import type { ChampionTemplate, RoleId } from "./templates/champion";
import type { RoleTemplate } from "./templates/role";
import type { ItemTemplate } from "./templates/item";
import type { RuneTemplate } from "./templates/rune";
import type { SummonerSpellTemplate } from "./templates/summoner-spell";
import type { PowerSpikeTemplate } from "./templates/power-spike";
import type { ObjectiveTemplate } from "./templates/objective";
import type { TempoTemplate } from "./templates/tempo";
import type { EconomyTemplate } from "./templates/economy";
import type { MatchupTemplate } from "./templates/matchup";
import type { MapTemplate } from "./templates/map";
import type { VisionTemplate } from "./templates/vision";
import { ROLE_TEMPLATES } from "./roles/seed";

interface RegistryStore {
  champions: Map<string, ChampionTemplate>;
  roles: Map<RoleId, RoleTemplate>;
  items: Map<string, ItemTemplate>;
  runes: Map<string, RuneTemplate>;
  summonerSpells: Map<string, SummonerSpellTemplate>;
  powerSpikes: Map<string, PowerSpikeTemplate>;
  objectives: Map<string, ObjectiveTemplate>;
  tempo: Map<string, TempoTemplate>;
  economy: Map<string, EconomyTemplate>;
  matchups: Map<string, MatchupTemplate>;
  map: Map<string, MapTemplate>;
  vision: Map<string, VisionTemplate>;
}

const store: RegistryStore = {
  champions: new Map(),
  roles: new Map(Object.entries(ROLE_TEMPLATES) as [RoleId, RoleTemplate][]),
  items: new Map(),
  runes: new Map(),
  summonerSpells: new Map(),
  powerSpikes: new Map(),
  objectives: new Map(),
  tempo: new Map(),
  economy: new Map(),
  matchups: new Map(),
  map: new Map(),
  vision: new Map(),
};

// -- champions ---------------------------------------------------------------
export function registerChampion(c: ChampionTemplate): void { store.champions.set(c.id, c); }
export function getChampionRecord(id: string): ChampionTemplate | null { return store.champions.get(id) ?? null; }
export function allChampionRecords(): ChampionTemplate[] { return [...store.champions.values()]; }

// -- roles -------------------------------------------------------------------
export function getRoleRecord(id: RoleId): RoleTemplate { return store.roles.get(id)!; }
export function allRoleRecords(): RoleTemplate[] { return [...store.roles.values()]; }

// -- items -------------------------------------------------------------------
export function registerItem(i: ItemTemplate): void { store.items.set(i.id, i); }
export function getItemRecord(id: string): ItemTemplate | null { return store.items.get(id) ?? null; }
export function allItemRecords(): ItemTemplate[] { return [...store.items.values()]; }

// -- runes -------------------------------------------------------------------
export function registerRune(r: RuneTemplate): void { store.runes.set(r.id, r); }
export function getRuneRecord(id: string): RuneTemplate | null { return store.runes.get(id) ?? null; }

// -- summoner spells ---------------------------------------------------------
export function registerSummonerSpell(s: SummonerSpellTemplate): void { store.summonerSpells.set(s.id, s); }
export function getSummonerSpellRecord(id: string): SummonerSpellTemplate | null { return store.summonerSpells.get(id) ?? null; }

// -- power spikes ------------------------------------------------------------
export function registerPowerSpike(p: PowerSpikeTemplate): void { store.powerSpikes.set(p.id, p); }
export function getPowerSpikeRecord(id: string): PowerSpikeTemplate | null { return store.powerSpikes.get(id) ?? null; }

// -- objectives --------------------------------------------------------------
export function registerObjective(o: ObjectiveTemplate): void { store.objectives.set(o.id, o); }
export function getObjectiveRecord(id: string): ObjectiveTemplate | null { return store.objectives.get(id) ?? null; }

// -- tempo -------------------------------------------------------------------
export function registerTempo(t: TempoTemplate): void { store.tempo.set(t.id, t); }
export function getTempoRecord(id: string): TempoTemplate | null { return store.tempo.get(id) ?? null; }

// -- economy -----------------------------------------------------------------
export function registerEconomy(e: EconomyTemplate): void { store.economy.set(e.id, e); }
export function getEconomyRecord(id: string): EconomyTemplate | null { return store.economy.get(id) ?? null; }

// -- matchups ----------------------------------------------------------------
export function registerMatchup(m: MatchupTemplate): void { store.matchups.set(m.id, m); }
export function getMatchupRecord(championId: string, opponentId: string): MatchupTemplate | null {
  return store.matchups.get(`${championId}_vs_${opponentId}`) ?? null;
}

// -- map ---------------------------------------------------------------------
export function registerMapZone(m: MapTemplate): void { store.map.set(m.id, m); }
export function getMapZoneRecord(id: string): MapTemplate | null { return store.map.get(id) ?? null; }

// -- vision ------------------------------------------------------------------
export function registerVision(v: VisionTemplate): void { store.vision.set(v.id, v); }
export function getVisionRecord(id: string): VisionTemplate | null { return store.vision.get(id) ?? null; }

/** Test / hydration helper — wipes the registry (except role templates). */
export function __resetRegistryForHydration(): void {
  store.champions.clear();
  store.items.clear();
  store.runes.clear();
  store.summonerSpells.clear();
  store.powerSpikes.clear();
  store.objectives.clear();
  store.tempo.clear();
  store.economy.clear();
  store.matchups.clear();
  store.map.clear();
  store.vision.clear();
}
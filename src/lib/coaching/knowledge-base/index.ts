// ---------------------------------------------------------------------------
// BotDiff League Knowledge Base — the single source of truth for League of
// Legends metadata. No coaching logic lives here. Coach Engine reads from
// this facade instead of memorizing facts.
//
//   Data Dragon / Riot API → Knowledge Base → League Intelligence → Coach Engine
//
// This module is pure + client-safe.
// ---------------------------------------------------------------------------

export * from "./types";
export * from "./templates";
export * from "./roles";
export * from "./registry";
export * from "./data-dragon-adapter";
export * from "./fundamentals";
export * from "./decision-library";
export * from "./role-differentiation";

import * as Registry from "./registry";
import { ROLE_INTELLIGENCE, getRoleIntelligence } from "./roles";
import { hydrateFromDataDragon } from "./data-dragon-adapter";
import {
  LEAGUE_FUNDAMENTALS,
  ALL_FUNDAMENTALS,
  getFundamental,
  isFundamentalId,
} from "./fundamentals";
import {
  DECISION_LIBRARY,
  getDecisionPattern,
  decisionsByFundamental,
  decisionsForRole,
} from "./decision-library";
import {
  ROLE_DIFFERENTIATION,
  roleExpressionsFor,
  roleExpressionFor,
} from "./role-differentiation";

/**
 * Namespaced facade. Coach Engine + intelligence modules should ask through
 * this object so the storage layer can evolve (curated → Data Dragon →
 * remote) without churning consumers.
 */
export const LeagueKnowledgeBase = {
  Champion: {
    get: Registry.getChampionRecord,
    register: Registry.registerChampion,
    all: Registry.allChampionRecords,
  },
  Role: {
    get: Registry.getRoleRecord,
    all: Registry.allRoleRecords,
    intelligence: getRoleIntelligence,
    allIntelligence: () => ROLE_INTELLIGENCE,
  },
  Item: {
    get: Registry.getItemRecord,
    register: Registry.registerItem,
    all: Registry.allItemRecords,
  },
  Rune: { get: Registry.getRuneRecord, register: Registry.registerRune },
  SummonerSpell: { get: Registry.getSummonerSpellRecord, register: Registry.registerSummonerSpell },
  PowerSpike: { get: Registry.getPowerSpikeRecord, register: Registry.registerPowerSpike },
  Objective: { get: Registry.getObjectiveRecord, register: Registry.registerObjective },
  Tempo: { get: Registry.getTempoRecord, register: Registry.registerTempo },
  Economy: { get: Registry.getEconomyRecord, register: Registry.registerEconomy },
  Matchup: { get: Registry.getMatchupRecord, register: Registry.registerMatchup },
  Map: { get: Registry.getMapZoneRecord, register: Registry.registerMapZone },
  Vision: { get: Registry.getVisionRecord, register: Registry.registerVision },
  Fundamental: {
    get: getFundamental,
    all: () => ALL_FUNDAMENTALS,
    is: isFundamentalId,
    map: () => LEAGUE_FUNDAMENTALS,
  },
  Decision: {
    get: getDecisionPattern,
    all: () => DECISION_LIBRARY,
    byFundamental: decisionsByFundamental,
    byRole: decisionsForRole,
  },
  RoleDifferentiation: {
    all: () => ROLE_DIFFERENTIATION,
    forFundamental: roleExpressionsFor,
    forRole: roleExpressionFor,
  },
  hydrateFromDataDragon,
} as const;

export type LeagueKnowledgeBaseFacade = typeof LeagueKnowledgeBase;
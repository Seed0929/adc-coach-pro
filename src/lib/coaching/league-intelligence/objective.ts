// ---------------------------------------------------------------------------
// Objective Intelligence — factual metadata about neutral / structural objs.
// Facts only: what an objective IS, when it's contested, what pressure it
// grants. Never who should take it or how the player should play around it.
// ---------------------------------------------------------------------------
import type { KnowledgeSource } from "../league-knowledge";

export type ObjectiveId = "grubs" | "herald" | "dragon" | "atakhan" | "baron" | "elder" | "tower" | "inhibitor" | "nexus";

export interface ObjectiveMeta {
  id: ObjectiveId;
  label: string;
  firstSpawnSeconds: number | null;
  respawnSeconds: number | null;
  primaryReward: string;
  location: "top-river" | "bot-river" | "top-lane" | "mid-lane" | "bot-lane" | "base";
  source: KnowledgeSource;
}

const OBJECTIVES: Record<ObjectiveId, ObjectiveMeta> = {
  grubs: { id: "grubs", label: "Void Grubs", firstSpawnSeconds: 6 * 60, respawnSeconds: null, primaryReward: "Stacking tower-damage buff", location: "top-river", source: "curated" },
  herald: { id: "herald", label: "Rift Herald", firstSpawnSeconds: 14 * 60, respawnSeconds: null, primaryReward: "Tower plate / structure pressure", location: "top-river", source: "curated" },
  dragon: { id: "dragon", label: "Elemental Drake", firstSpawnSeconds: 5 * 60, respawnSeconds: 5 * 60, primaryReward: "Stacking elemental buff → soul", location: "bot-river", source: "curated" },
  atakhan: { id: "atakhan", label: "Atakhan", firstSpawnSeconds: 20 * 60, respawnSeconds: null, primaryReward: "Map-wide team buff", location: "top-river", source: "curated" },
  baron: { id: "baron", label: "Baron Nashor", firstSpawnSeconds: 25 * 60, respawnSeconds: 6 * 60, primaryReward: "Empowered minions / siege buff", location: "top-river", source: "curated" },
  elder: { id: "elder", label: "Elder Dragon", firstSpawnSeconds: null, respawnSeconds: 6 * 60, primaryReward: "Execute + burn damage", location: "bot-river", source: "curated" },
  tower: { id: "tower", label: "Turret", firstSpawnSeconds: null, respawnSeconds: null, primaryReward: "Gold + map control", location: "top-lane", source: "curated" },
  inhibitor: { id: "inhibitor", label: "Inhibitor", firstSpawnSeconds: null, respawnSeconds: 5 * 60, primaryReward: "Super minions", location: "top-lane", source: "curated" },
  nexus: { id: "nexus", label: "Nexus", firstSpawnSeconds: null, respawnSeconds: null, primaryReward: "Game win", location: "base", source: "curated" },
};

export function getObjective(id: ObjectiveId): ObjectiveMeta { return OBJECTIVES[id]; }
export function allObjectives(): ObjectiveMeta[] { return Object.values(OBJECTIVES); }

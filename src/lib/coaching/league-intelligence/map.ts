// ---------------------------------------------------------------------------
// Map Intelligence — factual metadata about Summoner's Rift zones.
// ---------------------------------------------------------------------------
import type { KnowledgeSource } from "../league-knowledge";

export type MapZone =
  | "top-lane" | "mid-lane" | "bot-lane"
  | "top-river" | "bot-river"
  | "blue-jungle" | "red-jungle"
  | "base";

export interface MapZoneMeta {
  zone: MapZone;
  label: string;
  side: "blue" | "red" | "neutral";
  adjacentObjectives: string[];
  source: KnowledgeSource;
}

const ZONES: Record<MapZone, MapZoneMeta> = {
  "top-lane": { zone: "top-lane", label: "Top Lane", side: "neutral", adjacentObjectives: ["herald", "grubs", "baron"], source: "curated" },
  "mid-lane": { zone: "mid-lane", label: "Mid Lane", side: "neutral", adjacentObjectives: [], source: "curated" },
  "bot-lane": { zone: "bot-lane", label: "Bot Lane", side: "neutral", adjacentObjectives: ["dragon"], source: "curated" },
  "top-river": { zone: "top-river", label: "Top Side River", side: "neutral", adjacentObjectives: ["herald", "grubs", "baron", "atakhan"], source: "curated" },
  "bot-river": { zone: "bot-river", label: "Bot Side River", side: "neutral", adjacentObjectives: ["dragon", "elder"], source: "curated" },
  "blue-jungle": { zone: "blue-jungle", label: "Blue Side Jungle", side: "blue", adjacentObjectives: [], source: "curated" },
  "red-jungle": { zone: "red-jungle", label: "Red Side Jungle", side: "red", adjacentObjectives: [], source: "curated" },
  "base": { zone: "base", label: "Base", side: "neutral", adjacentObjectives: ["nexus", "inhibitor"], source: "curated" },
};

export function getZone(zone: MapZone): MapZoneMeta { return ZONES[zone]; }
export function allZones(): MapZoneMeta[] { return Object.values(ZONES); }

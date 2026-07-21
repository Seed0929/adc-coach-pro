import type { KnowledgeSource } from "../types";

export type MapZoneId =
  | "top-lane" | "mid-lane" | "bot-lane"
  | "blue-jungle" | "red-jungle"
  | "river" | "dragon-pit" | "baron-pit" | "atakhan-pit"
  | "base";

export interface MapTemplate {
  id: MapZoneId;
  label: string;
  side: "blue" | "red" | "neutral";
  adjacentZones: MapZoneId[];
  visionAnchors: string[];
  notableInteractions: string[];
  source: KnowledgeSource;
}

export function emptyMapTemplate(id: MapZoneId, label: string, side: MapTemplate["side"]): MapTemplate {
  return {
    id, label, side,
    adjacentZones: [],
    visionAnchors: [],
    notableInteractions: [],
    source: "curated",
  };
}
import type { GamePhase, KnowledgeSource } from "../types";
import type { RoleId } from "./champion";

export type VisionConceptId =
  | "control-ward" | "trinket-ward" | "deep-ward"
  | "sweeper-clear" | "objective-vision" | "counter-jungle-vision";

export interface VisionTemplate {
  id: VisionConceptId;
  label: string;
  purpose: string;
  idealPhase: GamePhase | "any";
  ownerRoles: RoleId[];
  placementAnchors: string[];
  source: KnowledgeSource;
}

export function emptyVisionTemplate(id: VisionConceptId, label: string): VisionTemplate {
  return {
    id, label,
    purpose: "",
    idealPhase: "any",
    ownerRoles: [],
    placementAnchors: [],
    source: "curated",
  };
}
// ---------------------------------------------------------------------------
// Tempo Intelligence — factual League tempo vocabulary.
// Defines concepts. Never evaluates a player or picks a right answer.
// ---------------------------------------------------------------------------
import type { KnowledgeSource } from "../league-knowledge";

export type TempoConceptId =
  | "recallEfficiency" | "goldEfficiency" | "rotationTiming"
  | "waveTiming" | "objectiveTiming" | "mapTempo";

export interface TempoConcept {
  id: TempoConceptId;
  label: string;
  definition: string;
  source: KnowledgeSource;
}

const TEMPO: Record<TempoConceptId, TempoConcept> = {
  recallEfficiency: { id: "recallEfficiency", label: "Recall efficiency", definition: "Timing recalls with wave state so no gold, XP, or turret pressure is lost.", source: "curated" },
  goldEfficiency: { id: "goldEfficiency", label: "Gold efficiency", definition: "Converting time and space into gold at the highest possible rate.", source: "curated" },
  rotationTiming: { id: "rotationTiming", label: "Rotation timing", definition: "Arriving at the next objective or lane with priority, not after the fight.", source: "curated" },
  waveTiming: { id: "waveTiming", label: "Wave timing", definition: "Manipulating wave state so it arrives where and when you need it.", source: "curated" },
  objectiveTiming: { id: "objectiveTiming", label: "Objective timing", definition: "Setting up vision, prio, and cooldowns before a neutral objective spawns.", source: "curated" },
  mapTempo: { id: "mapTempo", label: "Map tempo", definition: "The team-wide rhythm of pressure, rotations, and resets across the whole map.", source: "curated" },
};

export function getTempoConcept(id: TempoConceptId): TempoConcept { return TEMPO[id]; }
export function allTempoConcepts(): TempoConcept[] { return Object.values(TEMPO); }

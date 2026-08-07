// ---------------------------------------------------------------------------
// Item Intelligence V1 — permanent interfaces ONLY (Sprint 4.6).
//
//   Data Dragon Provider → [Item Intelligence] → Coaching Engine
//
// Riot facts (name, gold, stats, build path, tags, image, patch) are populated
// automatically through the Data Dragon bridge. EVERY coaching field is a
// structural placeholder (`Pending`) to be filled by future intelligence
// layers. Nothing here recommends builds, champions, purchase order, matchups
// or optimal usage. Pure + client-safe: no Riot endpoints, no statistics.
// ---------------------------------------------------------------------------
import { PENDING, type GamePhase, type KnowledgeSource, type Pending, type Rating } from "../knowledge-base/types";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type { CurriculumTopicId } from "../knowledge-base/curriculum";

export type ItemValueRating = Rating | Pending;

export type ItemPowerSpikeType =
  | "component" | "first-item" | "two-item" | "three-item"
  | "boots" | "starter" | "consumable" | "situational" | "unknown" | Pending;

export type ItemRiskProfile = "low" | "medium" | "high" | "unknown" | Pending;

/** Riot's own item facts — mirrored, never interpreted. */
export interface ItemOfficialMetadata {
  dataDragonId: string;
  name: string;
  plaintext: string;
  /** Raw Riot description (contains active/passive text markup). */
  description: string;
  /** Active / passive text as Riot ships it (unparsed, unedited). */
  effectText: string;
  officialTags: string[];
  stats: Record<string, number>;
  gold: { total: number; base: number; sell: number; purchasable: boolean };
  /** Component item ids Riot lists this item as building FROM. */
  components: string[];
  /** Item ids Riot lists this item as building INTO. */
  buildsInto: string[];
  /** Riot build-path depth (1 = basic). */
  depth: number;
  image: string;
  patch: string;
}

/** Reference into the permanent League Decision Library. */
export interface ItemDecisionReference {
  decisionId: string;
  label: string | Pending;
}

export interface ItemCurriculumReference {
  topicId: CurriculumTopicId | Pending;
  fundamental: LeagueFundamentalId | Pending;
  label: string | Pending;
}

export interface ItemHabitReference {
  habitId: string;
  fundamental: LeagueFundamentalId | Pending;
  label: string | Pending;
}

export interface ItemReplayReference {
  momentId: string;
  label: string | Pending;
  phase?: GamePhase;
}

export interface ItemPracticeReference {
  practiceId: string;
  label: string | Pending;
  fundamental: LeagueFundamentalId | Pending;
}

/** Phase-by-phase value placeholders (coaching layers populate these). */
export interface ItemPhaseValue {
  early: ItemValueRating;
  mid: ItemValueRating;
  late: ItemValueRating;
  scaling: ItemValueRating;
}

/** Structured value matrix — placeholders only, never inferred from stats. */
export interface ItemValueMatrix {
  burst: ItemValueRating;
  sustain: ItemValueRating;
  siege: ItemValueRating;
  objective: ItemValueRating;
  waveclear: ItemValueRating;
  splitPush: ItemValueRating;
  teamfight: ItemValueRating;
  defensive: ItemValueRating;
  offensive: ItemValueRating;
  utility: ItemValueRating;
  snowball: ItemValueRating;
  comeback: ItemValueRating;
  economy: ItemValueRating;
}

export interface ItemPhilosophy {
  timing: string | Pending;
  replacement: string | Pending;
  sell: string | Pending;
}

export interface ItemMistakeLibrary {
  purchase: string[];
  delay: string[];
}

export interface ItemIdentity {
  label: string | Pending;
  primaryPurpose: string | Pending;
  secondaryPurpose: string | Pending;
  powerSpikeType: ItemPowerSpikeType;
}

export interface ItemProfileV1 {
  itemId: string;
  identity: ItemIdentity;
  phaseValue: ItemPhaseValue;
  value: ItemValueMatrix;
  riskProfile: ItemRiskProfile;
  philosophy: ItemPhilosophy;
  mistakes: ItemMistakeLibrary;
  decisionReferences: ItemDecisionReference[];
  curriculumReferences: ItemCurriculumReference[];
  habitReferences: ItemHabitReference[];
  replayReferences: ItemReplayReference[];
  practiceReferences: ItemPracticeReference[];
  /** Riot facts. Null until the Data Dragon bridge hydrates this profile. */
  official: ItemOfficialMetadata | null;
  source: KnowledgeSource;
  patch: string | Pending;
  /** True only when coaching content (not Riot facts) exists. */
  populated: boolean;
}

/** Every accessor returns provenance so consumers can degrade safely. */
export interface ItemResolution<T> {
  itemId: string;
  /** True when the answer came from a registered item profile. */
  fromItem: boolean;
  value: T;
}

function pendingValueMatrix(): ItemValueMatrix {
  return {
    burst: PENDING, sustain: PENDING, siege: PENDING, objective: PENDING,
    waveclear: PENDING, splitPush: PENDING, teamfight: PENDING,
    defensive: PENDING, offensive: PENDING, utility: PENDING,
    snowball: PENDING, comeback: PENDING, economy: PENDING,
  };
}

/** The canonical empty profile — all coaching fields are placeholders. */
export function emptyItemProfileV1(itemId: string): ItemProfileV1 {
  return {
    itemId,
    identity: {
      label: PENDING,
      primaryPurpose: PENDING,
      secondaryPurpose: PENDING,
      powerSpikeType: PENDING,
    },
    phaseValue: { early: PENDING, mid: PENDING, late: PENDING, scaling: PENDING },
    value: pendingValueMatrix(),
    riskProfile: PENDING,
    philosophy: { timing: PENDING, replacement: PENDING, sell: PENDING },
    mistakes: { purchase: [], delay: [] },
    decisionReferences: [],
    curriculumReferences: [],
    habitReferences: [],
    replayReferences: [],
    practiceReferences: [],
    official: null,
    source: "curated",
    patch: PENDING,
    populated: false,
  };
}

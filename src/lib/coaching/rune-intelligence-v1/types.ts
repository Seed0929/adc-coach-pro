// ---------------------------------------------------------------------------
// Rune Intelligence V1 — permanent interfaces ONLY (Sprint 4.7).
//
//   Data Dragon Provider → [Rune Intelligence] → Coaching Engine
//
// Riot facts (name, tree, slot, description, icon, patch, keystone status) are
// populated automatically through the Data Dragon bridge. EVERY coaching field
// is a structural placeholder (`Pending`) for future intelligence layers.
// Nothing here recommends runes, infers builds, or produces champion or matchup
// advice. Pure + client-safe: no Riot endpoints, no statistics.
// ---------------------------------------------------------------------------
import { PENDING, type KnowledgeSource, type Pending, type Rating, type GamePhase } from "../knowledge-base/types";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type { CurriculumTopicId } from "../knowledge-base/curriculum";

export type RuneValueRating = Rating | Pending;

export type RuneSlotType = "keystone" | "minor" | "stat-shard" | "unknown" | Pending;

export type RuneScalingProfile = "early" | "mid" | "late" | "flat" | "unknown" | Pending;

/** Riot's own rune facts — mirrored, never interpreted. */
export interface RuneOfficialMetadata {
  dataDragonId: number;
  key: string;
  name: string;
  /** Riot short description (markup stripped for readability). */
  shortDesc: string;
  /** Riot long description (markup stripped for readability). */
  longDesc: string;
  /** Riot's full official text, verbatim and unedited. */
  officialText: string;
  treeId: number;
  treeKey: string;
  treeName: string;
  treeIcon: string;
  /** 0 = keystone row. */
  slot: number;
  slotType: RuneSlotType;
  isKeystone: boolean;
  /** Riot-derived descriptors (tree key + slot classification). */
  tags: string[];
  icon: string;
  patch: string;
}

export interface RuneDecisionReference {
  decisionId: string;
  label: string | Pending;
}

export interface RuneCurriculumReference {
  topicId: CurriculumTopicId | Pending;
  fundamental: LeagueFundamentalId | Pending;
  label: string | Pending;
}

export interface RuneHabitReference {
  habitId: string;
  fundamental: LeagueFundamentalId | Pending;
  label: string | Pending;
}

export interface RuneReplayReference {
  momentId: string;
  label: string | Pending;
  phase?: GamePhase;
}

export interface RunePracticeReference {
  practiceId: string;
  label: string | Pending;
  fundamental: LeagueFundamentalId | Pending;
}

export interface RuneRecoveryReference {
  recoveryId: string;
  label: string | Pending;
  fundamental: LeagueFundamentalId | Pending;
}

export interface RuneIdentity {
  label: string | Pending;
  primaryPurpose: string | Pending;
  secondaryPurpose: string | Pending;
  scalingProfile: RuneScalingProfile;
}

/** Structured value matrix — placeholders only, never inferred from text. */
export interface RuneValueMatrix {
  lane: RuneValueRating;
  teamfight: RuneValueRating;
  trading: RuneValueRating;
  roaming: RuneValueRating;
  objective: RuneValueRating;
  waveclear: RuneValueRating;
  snowball: RuneValueRating;
  comeback: RuneValueRating;
  consistency: RuneValueRating;
  resource: RuneValueRating;
}

export interface RuneProfileV1 {
  runeId: number;
  identity: RuneIdentity;
  value: RuneValueMatrix;
  decisionReferences: RuneDecisionReference[];
  curriculumReferences: RuneCurriculumReference[];
  habitReferences: RuneHabitReference[];
  replayReferences: RuneReplayReference[];
  practiceReferences: RunePracticeReference[];
  recoveryReferences: RuneRecoveryReference[];
  /** Riot facts. Null until the Data Dragon bridge hydrates this profile. */
  official: RuneOfficialMetadata | null;
  source: KnowledgeSource;
  patch: string | Pending;
  /** True only when coaching content (not Riot facts) exists. */
  populated: boolean;
}

/** Every accessor returns provenance so consumers can degrade safely. */
export interface RuneResolution<T> {
  runeId: number;
  fromRune: boolean;
  value: T;
}

function pendingValueMatrix(): RuneValueMatrix {
  return {
    lane: PENDING, teamfight: PENDING, trading: PENDING, roaming: PENDING,
    objective: PENDING, waveclear: PENDING, snowball: PENDING,
    comeback: PENDING, consistency: PENDING, resource: PENDING,
  };
}

/** The canonical empty profile — all coaching fields are placeholders. */
export function emptyRuneProfileV1(runeId: number): RuneProfileV1 {
  return {
    runeId,
    identity: {
      label: PENDING,
      primaryPurpose: PENDING,
      secondaryPurpose: PENDING,
      scalingProfile: PENDING,
    },
    value: pendingValueMatrix(),
    decisionReferences: [],
    curriculumReferences: [],
    habitReferences: [],
    replayReferences: [],
    practiceReferences: [],
    recoveryReferences: [],
    official: null,
    source: "curated",
    patch: PENDING,
    populated: false,
  };
}

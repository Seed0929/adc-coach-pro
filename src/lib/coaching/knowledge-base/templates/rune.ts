import type { KnowledgeSource } from "../types";
import type { ChampionClass, DamageType } from "./champion";

export type RunePath = "precision" | "domination" | "sorcery" | "resolve" | "inspiration";
export type RuneKind = "keystone" | "minor" | "shard" | "tree";

export interface RuneTemplate {
  id: string;
  name: string;
  path: RunePath;
  kind: RuneKind;
  theme: string;
  idealUsers: string[];
  championClasses: ChampionClass[];
  damageType: DamageType | "any";
  tradeoffs: string[];
  source: KnowledgeSource;
}

export function emptyRuneTemplate(id: string, name: string, path: RunePath, kind: RuneKind): RuneTemplate {
  return {
    id, name, path, kind,
    theme: "",
    idealUsers: [],
    championClasses: [],
    damageType: "any",
    tradeoffs: [],
    source: "curated",
  };
}
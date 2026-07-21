import type { KnowledgeSource } from "../types";
import type { RoleId } from "./champion";

export interface SummonerSpellTemplate {
  id: string;
  name: string;
  primaryUse: string;
  secondaryUse?: string;
  idealRoles: RoleId[];
  tradeoffs: string[];
  source: KnowledgeSource;
}

export function emptySummonerSpellTemplate(id: string, name: string): SummonerSpellTemplate {
  return {
    id, name,
    primaryUse: "",
    idealRoles: [],
    tradeoffs: [],
    source: "curated",
  };
}
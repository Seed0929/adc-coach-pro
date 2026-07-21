import type { RoleId } from "../templates/champion";
import type { RoleIntelligence } from "./base";
import { TopIntelligence } from "./top";
import { JungleIntelligence } from "./jungle";
import { MidIntelligence } from "./mid";
import { AdcIntelligence } from "./adc";
import { SupportIntelligence } from "./support";

export * from "./base";
export { TopIntelligence, JungleIntelligence, MidIntelligence, AdcIntelligence, SupportIntelligence };

export const ROLE_INTELLIGENCE: Record<RoleId, RoleIntelligence> = {
  top: TopIntelligence,
  jungle: JungleIntelligence,
  mid: MidIntelligence,
  adc: AdcIntelligence,
  support: SupportIntelligence,
};

export function getRoleIntelligence(id: RoleId): RoleIntelligence {
  return ROLE_INTELLIGENCE[id];
}
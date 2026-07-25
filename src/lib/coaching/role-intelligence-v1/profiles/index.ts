import type { RoleId } from "../../knowledge-base/templates/champion";
import type { RoleProfile } from "../types";
import { TOP_PROFILE } from "./top";
import { JUNGLE_PROFILE } from "./jungle";
import { MID_PROFILE } from "./mid";
import { ADC_PROFILE } from "./adc";
import { SUPPORT_PROFILE } from "./support";

export const ROLE_PROFILES: Record<RoleId, RoleProfile> = {
  top: TOP_PROFILE,
  jungle: JUNGLE_PROFILE,
  mid: MID_PROFILE,
  adc: ADC_PROFILE,
  support: SUPPORT_PROFILE,
};

export { TOP_PROFILE, JUNGLE_PROFILE, MID_PROFILE, ADC_PROFILE, SUPPORT_PROFILE };

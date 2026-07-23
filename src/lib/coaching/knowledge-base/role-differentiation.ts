// ---------------------------------------------------------------------------
// Role Differentiation — how each role EXPRESSES the same Fundamental.
//
// The League concept (e.g. Tempo) never changes. Only the role's execution
// changes. Coach Engine reads this map so it can speak to a role about a
// concept without re-defining the concept per role.
//
// Facts only. No player evaluation.
// ---------------------------------------------------------------------------
import type { LeagueFundamentalId } from "./fundamentals";
import type { RoleId } from "./templates/champion";
import type { KnowledgeSource } from "./types";

export interface RoleExpression {
  role: RoleId;
  /** How this role expresses the fundamental in one sentence. */
  expression: string;
  /** A canonical example of the fundamental for this role. */
  example: string;
}

export interface FundamentalRoleMap {
  fundamental: LeagueFundamentalId;
  expressions: RoleExpression[];
  source: KnowledgeSource;
}

const M = (
  fundamental: LeagueFundamentalId,
  expressions: RoleExpression[],
): FundamentalRoleMap => ({ fundamental, expressions, source: "curated" });

export const ROLE_DIFFERENTIATION: FundamentalRoleMap[] = [
  M("tempo", [
    { role: "top", expression: "Recall before side lane pressure returns.", example: "Crash side, TP back on the next wave." },
    { role: "jungle", expression: "Reset around objective timers.", example: "Full-clear and reset 45s before Dragon." },
    { role: "mid", expression: "Reset before roam windows.", example: "Shove mid, recall, roam bot with prio." },
    { role: "adc", expression: "Reset around item spikes.", example: "Crash bot at 1300g for a component spike." },
    { role: "support", expression: "Reset around vision setup.", example: "Recall for Control Ward before Dragon spawn." },
  ]),
  M("wave-management", [
    { role: "top", expression: "Freeze to survive; slow-push to leverage a dive.", example: "Freeze at tower down 20 CS to reset the matchup." },
    { role: "jungle", expression: "Manipulate side lanes via ganks/counter-ganks.", example: "Gank a pushed lane to reset the wave state." },
    { role: "mid", expression: "Shove first, then act on prio.", example: "Push mid to bounce, then roam bot." },
    { role: "adc", expression: "Match support's plan every wave.", example: "Freeze while support roams to ward." },
    { role: "support", expression: "Set wave state around vision needs.", example: "Slow-push to leave lane and ward Dragon." },
  ]),
  M("vision", [
    { role: "top", expression: "River wards for TP and jungle tracking.", example: "Ward top river before pushing in." },
    { role: "jungle", expression: "Deep vision on lead, defensive vision behind.", example: "Ward enemy blue when ahead." },
    { role: "mid", expression: "River wards to enable roams.", example: "Ward mid river before rotating bot." },
    { role: "adc", expression: "Vision around dragon pit.", example: "Ward dragon pit 60s early with support." },
    { role: "support", expression: "Owns the vision map end-to-end.", example: "Sweep enemy vision before every objective." },
  ]),
  M("objective-control", [
    { role: "top", expression: "Trade side for objective side.", example: "Push top on Dragon spawn to trade if lost." },
    { role: "jungle", expression: "Anchor and secure with smite.", example: "Path to Dragon side with vision and smite ready." },
    { role: "mid", expression: "Bring prio to the objective.", example: "Shove mid then rotate to Dragon with prio." },
    { role: "adc", expression: "Deal damage in the pit with peel.", example: "Fight Dragon behind frontline at 2 items." },
    { role: "support", expression: "Own the vision + engage tool.", example: "Sweep pit and engage or peel based on champion." },
  ]),
  M("positioning", [
    { role: "top", expression: "Frontline distance or flank angle.", example: "Hold flank until engage is spent." },
    { role: "jungle", expression: "Enter fight from vision-safe angle.", example: "Path around vision to engage from behind." },
    { role: "mid", expression: "Damage from safe range on primary target.", example: "Ult reachable target from behind frontline." },
    { role: "adc", expression: "Kite from peel line.", example: "Stay one screen behind frontline and kite back." },
    { role: "support", expression: "Peel line for the ADC or engage angle.", example: "Hold peel range next to ADC in fights." },
  ]),
  M("power-spikes", [
    { role: "top", expression: "Trade tempo for first-item spike.", example: "Freeze and farm to Sunfire for a dive." },
    { role: "jungle", expression: "Look for skirmishes on item-1.", example: "Force fights around item-2 skirmish spike." },
    { role: "mid", expression: "Roam on level 6 and item-1.", example: "Shove and roam bot with ult up." },
    { role: "adc", expression: "Group at 2 items, sidelane at 3.", example: "Group for Dragon at 2 items with the team." },
    { role: "support", expression: "Support quest completes item-1.", example: "Finish quest by 14:00 to unlock vision item." },
  ]),
  M("map-movement", [
    { role: "top", expression: "Cross-map with TP; side lane pressure.", example: "TP flank onto Baron fight from top side." },
    { role: "jungle", expression: "Path to where lane prio exists.", example: "Path bot side when mid + bot have prio." },
    { role: "mid", expression: "Rotate on shove.", example: "Roam bot after crashing mid." },
    { role: "adc", expression: "Group at 2 items, sidelane at 3.", example: "Sidelane bot post-3 items to threaten a push." },
    { role: "support", expression: "Rotate with the ADC as a pair.", example: "Rotate to Dragon with ADC on every reset." },
  ]),
  M("resource-management", [
    { role: "top", expression: "Save TP for objective-swinging plays.", example: "Hold TP for Dragon flank, not for a wave." },
    { role: "jungle", expression: "Save smite for objective duels.", example: "Never use smite on a raptor before Dragon." },
    { role: "mid", expression: "Save ult for teamfight or pick.", example: "Hold ult for objective fight over solo kill." },
    { role: "adc", expression: "Save Flash for the fight, not the trade.", example: "Reserve Flash for objective peel." },
    { role: "support", expression: "Save engage for setup, not for chase.", example: "Hold engage until pit fight starts." },
  ]),
];

export function roleExpressionsFor(f: LeagueFundamentalId): RoleExpression[] {
  return ROLE_DIFFERENTIATION.find((m) => m.fundamental === f)?.expressions ?? [];
}

export function roleExpressionFor(f: LeagueFundamentalId, role: RoleId): RoleExpression | undefined {
  return roleExpressionsFor(f).find((e) => e.role === role);
}
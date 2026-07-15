// ---------------------------------------------------------------------------
// BotDiff Champion Intelligence Layer (Sprint 2)
//
// The SINGLE gate every coaching system must pass through before it says
// anything about a champion. Given a champion name it returns a normalized
// ChampionProfile — role, class, damage profile, archetype, identity, win
// condition, archetype-appropriate core items — so no consumer can accidentally
// coach Vel'Koz like an ADC or recommend Kraken Slayer on a mage.
//
// This module is a FACADE over League Knowledge (the metadata source of truth)
// + Champion Knowledge (curated ADC builds). It never invents facts: unknown
// champions get an honest `archetype: "unknown"` and consumers stay quiet
// instead of guessing.
//
// PURE + client-safe. No network, no secrets.
// ---------------------------------------------------------------------------
import {
  championClasses,
  championDamageProfile,
  championPowerSpikes,
  championRoles,
  championScaling,
  championWinCondition,
  getChampion,
  hasChampionIdentity,
  type ChampionClass,
  type DamageProfile,
  type LeagueRole,
  type ScalingTier,
} from "./league-knowledge";
import { ADC_BUILDS, type AdcArchetype } from "./champion-knowledge";

/**
 * The coaching-facing champion archetype. Every coaching decision (win
 * condition language, item review, trading pattern, teamfight role, power
 * spike core items) branches on THIS — never on raw class tags — so a new
 * champion only needs a correct archetype to be coached well.
 */
export type ChampionArchetype =
  // Marksmen
  | "crit-marksman"
  | "onhit-marksman"
  | "lethality-marksman"
  | "utility-marksman"
  | "hybrid-marksman"
  // Mages
  | "burst-mage"
  | "battlemage"
  | "artillery-mage"
  | "control-mage"
  // Assassins / bruisers
  | "assassin"
  | "diver"
  | "juggernaut"
  | "skirmisher"
  // Tanks / supports
  | "vanguard-tank"
  | "warden-tank"
  | "enchanter"
  | "catcher-support"
  | "unknown";

export interface ChampionProfile {
  name: string;
  primaryRole: LeagueRole | "unknown";
  secondaryRoles: LeagueRole[];
  classes: ChampionClass[];
  primaryClass: ChampionClass;
  damageProfile: DamageProfile;
  archetype: ChampionArchetype;
  scaling: ScalingTier;
  identity: string | null;
  /** A short "why you win" sentence, always aligned to the archetype. */
  winCondition: string;
  powerSpikes: string[];
  isMarksman: boolean;
  isMage: boolean;
  isAssassin: boolean;
  isBruiser: boolean;
  isTank: boolean;
  isSupport: boolean;
  /** Do we have enough to coach champion-specific decisions? */
  isKnown: boolean;
  /** Do we know the archetype well enough to recommend core items? */
  canCoachItems: boolean;
}

/** Normalize the champion key BotDiff receives (Riot uses "Velkoz", "KaiSa"). */
function normalizeKey(name: string): string[] {
  const raw = (name ?? "").trim();
  if (!raw) return [];
  const bare = raw.replace(/['\s.]/g, "");
  const variants = new Set<string>([
    raw,
    bare,
    bare.toLowerCase(),
    // "Velkoz" → "VelKoz", "Missfortune" → "MissFortune", "Khazix" → "KhaZix"
    bare.charAt(0).toUpperCase() + bare.slice(1),
  ]);
  // Known Riot-key ↔ display-name aliases used across the curated maps.
  const aliases: Record<string, string[]> = {
    Velkoz: ["VelKoz", "Vel'Koz"],
    VelKoz: ["Velkoz", "Vel'Koz"],
    KaiSa: ["Kai'Sa"],
    Kaisa: ["Kai'Sa", "KaiSa"],
    KhaZix: ["Kha'Zix"],
    Khazix: ["Kha'Zix", "KhaZix"],
    KogMaw: ["Kog'Maw"],
    Kogmaw: ["Kog'Maw", "KogMaw"],
    ChoGath: ["Cho'Gath"],
    Chogath: ["Cho'Gath", "ChoGath"],
    JarvanIV: ["Jarvan IV"],
    MissFortune: ["Miss Fortune"],
  };
  for (const v of Array.from(variants)) {
    for (const a of aliases[v] ?? []) variants.add(a);
  }
  return Array.from(variants);
}

/** Resolve the first lookup key that has ANY curated metadata. */
function resolveKey(name: string): string {
  for (const k of normalizeKey(name)) {
    if (hasChampionIdentity(k)) return k;
  }
  for (const k of normalizeKey(name)) {
    if (championClasses(k).length > 0) return k;
  }
  return name;
}

/** Pick the most specific class tag we know about. */
function pickPrimaryClass(classes: ChampionClass[]): ChampionClass {
  const priority: ChampionClass[] = [
    "Marksman", "Artillery", "Burst", "Battlemage", "Mage",
    "Assassin", "Skirmisher", "Diver", "Juggernaut", "Fighter",
    "Enchanter", "Catcher", "Controller", "Warden", "Vanguard", "Tank",
    "Specialist",
  ];
  for (const p of priority) if (classes.includes(p)) return p;
  return classes[0] ?? "unknown";
}

/** Map the curated ADC build archetype onto the shared archetype vocabulary. */
function marksmanArchetypeFromBuild(a: AdcArchetype | undefined): ChampionArchetype {
  switch (a) {
    case "crit": return "crit-marksman";
    case "onhit": return "onhit-marksman";
    case "lethality": return "lethality-marksman";
    case "utility": return "utility-marksman";
    case "hybrid": return "hybrid-marksman";
    default: return "crit-marksman";
  }
}

function deriveArchetype(
  key: string,
  classes: ChampionClass[],
  primary: ChampionClass,
  damage: DamageProfile,
): ChampionArchetype {
  // Marksmen — read the curated build archetype when we have one.
  if (primary === "Marksman" || classes.includes("Marksman")) {
    return marksmanArchetypeFromBuild(ADC_BUILDS[key]?.archetype);
  }
  if (primary === "Artillery") return "artillery-mage";
  if (primary === "Burst") return "burst-mage";
  if (primary === "Battlemage") return "battlemage";
  if (primary === "Mage") {
    if (damage === "AP" || damage === "hybrid") {
      if (classes.includes("Catcher")) return "control-mage";
      return "burst-mage";
    }
    return "control-mage";
  }
  if (primary === "Assassin") return "assassin";
  if (primary === "Skirmisher") return "skirmisher";
  if (primary === "Diver") return "diver";
  if (primary === "Juggernaut") return "juggernaut";
  if (primary === "Enchanter") return "enchanter";
  if (primary === "Catcher") return "catcher-support";
  if (primary === "Vanguard") return "vanguard-tank";
  if (primary === "Warden") return "warden-tank";
  if (primary === "Tank") return classes.includes("Vanguard") ? "vanguard-tank" : "warden-tank";
  if (primary === "Fighter") return "juggernaut";
  return "unknown";
}

/** Archetype → default win-condition language (never role-mismatched). */
function defaultWinCondition(name: string, archetype: ChampionArchetype): string {
  switch (archetype) {
    case "crit-marksman":
      return `As ${name} your win condition is scaling into a positioned crit carry — survive lane, hit your two-item spike, and deal damage from the back of every fight.`;
    case "onhit-marksman":
      return `As ${name} your win condition is the extended fight — get peel, reach your on-hit spike, and shred the enemy frontline in prolonged 5v5s.`;
    case "lethality-marksman":
      return `As ${name} your win condition is tempo: use your early pressure to take towers and objectives before the enemy scales past you.`;
    case "utility-marksman":
      return `As ${name} your win condition is enabling your team — safe scaling plus your ult decides the fights, not raw solo damage.`;
    case "hybrid-marksman":
      return `As ${name} your win condition is flexing between damage patterns — pick the item path that punishes the enemy comp and carry from the back.`;
    case "burst-mage":
      return `As ${name} your win condition is landing your combo on the priority target — stay alive through early fights, hit your AP spike, and delete a carry from range.`;
    case "artillery-mage":
      return `As ${name} your win condition is range and safety — poke enemies down from max distance behind your frontline until fights start on your terms.`;
    case "battlemage":
      return `As ${name} your win condition is a durable AP frontline presence — stack HP + AP and grind out extended fights the enemy can't kite.`;
    case "control-mage":
      return `As ${name} your win condition is zoning fights with your abilities — set up picks and area denial, don't chase raw damage.`;
    case "assassin":
      return `As ${name} your win condition is finding pickoffs — punish isolated targets, snowball a lead, and force fights when your ult is up.`;
    case "diver":
      return `As ${name} your win condition is starting fights on the enemy carry — dive on cooldowns you can survive, then peel back to your team.`;
    case "skirmisher":
      return `As ${name} your win condition is prolonged duels and side-lane pressure — split when you can 1v1, group when your team needs you.`;
    case "juggernaut":
      return `As ${name} your win condition is being the immovable frontline — soak damage, stick to a target, and out-trade in extended fights.`;
    case "vanguard-tank":
      return `As ${name} your win condition is high-value engage — find the fight your team wins on and start it with your ult.`;
    case "warden-tank":
      return `As ${name} your win condition is peel and disengage — keep your carry alive long enough for their damage to win the fight.`;
    case "enchanter":
      return `As ${name} your win condition is amplifying your carry — vision, positioning, and well-timed shields/heals decide fights.`;
    case "catcher-support":
      return `As ${name} your win condition is landing picks — hit a hook/root and your team turns the numbers advantage into an objective.`;
    default:
      return `Your win condition is playing to ${name}'s core identity — survive early, hit your key spikes, and take the fights your kit is designed for.`;
  }
}

/** Archetype-appropriate core items (illustrative, never a required build). */
const CORE_ITEMS_BY_ARCHETYPE: Record<ChampionArchetype, string[]> = {
  "crit-marksman":       ["Kraken Slayer", "Infinity Edge", "Lord Dominik's Regards"],
  "onhit-marksman":      ["Blade of the Ruined King", "Guinsoo's Rageblade", "Wit's End"],
  "lethality-marksman":  ["The Collector", "Serylda's Grudge", "Youmuu's Ghostblade"],
  "utility-marksman":    ["Kraken Slayer", "Runaan's Hurricane", "Infinity Edge"],
  "hybrid-marksman":     ["Kraken Slayer", "Guinsoo's Rageblade", "Nashor's Tooth"],
  "burst-mage":          ["Luden's Companion", "Shadowflame", "Rabadon's Deathcap"],
  "artillery-mage":      ["Liandry's Torment", "Shadowflame", "Rabadon's Deathcap"],
  "battlemage":          ["Rod of Ages", "Riftmaker", "Rabadon's Deathcap"],
  "control-mage":        ["Luden's Companion", "Zhonya's Hourglass", "Rabadon's Deathcap"],
  "assassin":            ["Opportunity / Hextech Rocketbelt", "Serylda's Grudge / Shadowflame", "Edge of Night / Zhonya's"],
  "diver":               ["Divine Sunderer / Trinity Force", "Sterak's Gage", "Death's Dance"],
  "juggernaut":          ["Stridebreaker / Trinity Force", "Sterak's Gage", "Death's Dance"],
  "skirmisher":          ["Trinity Force / BotRK", "Sterak's Gage", "Death's Dance"],
  "vanguard-tank":       ["Sunfire Aegis", "Thornmail / Kaenic Rookern", "Jak'Sho, The Protean"],
  "warden-tank":         ["Heartsteel / Iceborn Gauntlet", "Thornmail", "Kaenic Rookern"],
  "enchanter":           ["Moonstone Renewer / Locket", "Ardent Censer / Staff of Flowing Water", "Redemption"],
  "catcher-support":     ["Locket of the Iron Solari", "Zeke's Convergence", "Knight's Vow"],
  unknown:               ["First core item", "Second core item", "Third core item"],
};

/** The one call every coaching system MUST make before saying anything. */
export function getChampionProfile(name: string): ChampionProfile {
  const key = resolveKey(name);
  const identityRec = getChampion(key);
  const classes = championClasses(key);
  const primaryClass = pickPrimaryClass(classes);
  const damageProfile = championDamageProfile(key);
  const roles = championRoles(key);
  const scaling = championScaling(key);
  const powerSpikes = championPowerSpikes(key);
  const displayName = identityRec?.name ?? name;
  const archetype = deriveArchetype(key, classes, primaryClass, damageProfile);
  const winCondition = championWinCondition(key) ?? defaultWinCondition(displayName, archetype);
  const isMarksman = classes.includes("Marksman");
  const isMage =
    classes.includes("Mage") || classes.includes("Burst") ||
    classes.includes("Artillery") || classes.includes("Battlemage");
  const isAssassin = classes.includes("Assassin");
  const isBruiser =
    classes.includes("Fighter") || classes.includes("Skirmisher") ||
    classes.includes("Diver") || classes.includes("Juggernaut");
  const isTank =
    classes.includes("Tank") || classes.includes("Vanguard") || classes.includes("Warden");
  const isSupport = classes.includes("Enchanter") || classes.includes("Catcher");
  const isKnown = Boolean(identityRec) || classes.length > 0;
  const canCoachItems = archetype !== "unknown" && damageProfile !== "unknown";
  return {
    name: displayName,
    primaryRole: roles[0] ?? "unknown",
    secondaryRoles: roles.slice(1),
    classes,
    primaryClass,
    damageProfile,
    archetype,
    scaling,
    identity: identityRec?.identity ?? null,
    winCondition,
    powerSpikes,
    isMarksman,
    isMage,
    isAssassin,
    isBruiser,
    isTank,
    isSupport,
    isKnown,
    canCoachItems,
  };
}

/** Archetype-appropriate core items — used by Power Spike Timing. */
export function coreItemsFor(name: string): string[] {
  const profile = getChampionProfile(name);
  // Prefer the curated ADC_BUILDS entry when we have one — it's more specific
  // than the archetype default (e.g. Jhin's lethality build vs. generic).
  const key = resolveKey(name);
  const build = ADC_BUILDS[key];
  if (build) {
    const nonBoots = build.core.filter((i) => !/greaves|shoes|boots|treads|steelcaps/i.test(i));
    const names = nonBoots.length >= 3 ? nonBoots : build.core;
    if (names.length >= 3) return names.slice(0, 3);
  }
  return CORE_ITEMS_BY_ARCHETYPE[profile.archetype];
}

/** Role-safe language for "as the ADC" style phrases. */
export function championRoleLabel(name: string): string {
  const p = getChampionProfile(name);
  if (p.isMarksman) return "As the ADC";
  if (p.isMage) return `As ${p.name}`;
  if (p.isAssassin) return `As an assassin like ${p.name}`;
  if (p.isSupport) return "As the support";
  if (p.isTank) return `As the frontline`;
  if (p.isBruiser) return `As a bruiser like ${p.name}`;
  return `As ${p.name}`;
}

/**
 * VALIDATION HELPERS — used by tests and by consumers that want to assert
 * "this recommendation is legal for this champion" before rendering it.
 */

/** Would an ADC-crit recommendation ever be appropriate here? */
export function allowsCritBuild(name: string): boolean {
  const p = getChampionProfile(name);
  return p.isMarksman && (p.archetype === "crit-marksman" || p.archetype === "utility-marksman" || p.archetype === "hybrid-marksman");
}

/** Would AD carry itemization ever be appropriate here? */
export function allowsAdCarryBuild(name: string): boolean {
  const p = getChampionProfile(name);
  return p.isMarksman || (p.damageProfile === "AD" && (p.isBruiser || p.isAssassin));
}

/** Would AP mage itemization ever be appropriate here? */
export function allowsApMageBuild(name: string): boolean {
  const p = getChampionProfile(name);
  return p.isMage && (p.damageProfile === "AP" || p.damageProfile === "hybrid");
}

/**
 * True if a coaching label written for one role would be MISUSED on this
 * champion. Used to gate role-specific language across the engine.
 */
export function isRoleLanguageSafe(name: string, forRole: "adc" | "mage" | "support" | "tank" | "assassin" | "bruiser"): boolean {
  const p = getChampionProfile(name);
  switch (forRole) {
    case "adc": return p.isMarksman;
    case "mage": return p.isMage;
    case "support": return p.isSupport;
    case "tank": return p.isTank;
    case "assassin": return p.isAssassin;
    case "bruiser": return p.isBruiser;
  }
}
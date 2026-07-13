// ---------------------------------------------------------------------------
// BotDiff League Knowledge Module (Sprint 1.8)
//
// The SINGLE source of truth for League of Legends *metadata*. Every coaching
// system (Coach Engine, Item Review, Habit Detection, future Replay Coach)
// asks THIS module for factual information before generating any coaching.
//
// This module contains METADATA ONLY — no coaching logic, no opinions, no
// "what to do". It answers questions like:
//   - What class is this champion?
//   - What damage does it deal (AD / AP / hybrid)?
//   - What role(s) does it play?
//   - When does it spike / how does it scale?
//   - What category does an item / rune / summoner belong to?
//   - What patch is this knowledge based on?
//
// FUTURE DATA DRAGON: every field is optional-friendly and every record carries
// a `source` marker ("curated" today). Riot Data Dragon can later populate the
// same shapes automatically by swapping the seed data and flipping `source` to
// "datadragon" — no consumer needs to change. `hydrateFromDataDragon` is the
// designated (currently inert) entry point for that future work.
//
// PURE + client-safe. No network, no secrets, no side effects.
// ---------------------------------------------------------------------------

/** The patch this curated knowledge is aligned to. Data Dragon overwrites this. */
export const LEAGUE_PATCH: PatchVersion = {
  version: "14.24",
  source: "curated",
};

export interface PatchVersion {
  version: string;
  source: KnowledgeSource;
}

export type KnowledgeSource = "curated" | "datadragon";

// --- core enums (kept broad so Data Dragon values map cleanly) --------------

export type LeagueRole = "top" | "jungle" | "mid" | "adc" | "support";

/** Riot-style champion class tags (superset — Data Dragon uses a subset). */
export type ChampionClass =
  | "Marksman"
  | "Mage"
  | "Assassin"
  | "Fighter"
  | "Tank"
  | "Enchanter"
  | "Controller"
  | "Skirmisher"
  | "Diver"
  | "Juggernaut"
  | "Battlemage"
  | "Burst"
  | "Artillery"
  | "Warden"
  | "Vanguard"
  | "Catcher"
  | "Specialist"
  | "unknown";

export type DamageProfile = "AD" | "AP" | "hybrid" | "true" | "unknown";

/** When a champion is at its strongest relative to the game timeline. */
export type ScalingTier = "early" | "mid" | "late" | "flat" | "unknown";

// --- champion metadata ------------------------------------------------------

export interface ChampionIdentity {
  /** Stable key (matches Riot's champion key, e.g. "MissFortune"). */
  id: string;
  /** Display name. */
  name: string;
  /** One-line identity. */
  identity?: string;
  classes: ChampionClass[];
  damageProfile: DamageProfile;
  roles: LeagueRole[];
  scaling: ScalingTier;
  /** Human-readable power-spike notes (item/level breakpoints). */
  powerSpikes?: string[];
  winCondition?: string;
  playstyle?: string;
  source: KnowledgeSource;
}

// A curated seed of the ADC-centric pool BotDiff coaches today. Non-ADC
// champions are known via `THREAT_CLASSES` below (enough to reason about enemy
// comps) without needing a full identity record yet.
const CHAMPIONS: Record<string, ChampionIdentity> = {
  Jinx: c("Jinx", "Marksman", "AD", "late", "Reset-hungry hypercarry that takes over extended fights once ahead.", ["Two-item spike (crit)", "Passive reset in fights"]),
  Caitlyn: c("Caitlyn", "Marksman", "AD", "flat", "Lane-bully marksman that snowballs range and trap zoning into towers.", ["Level 2/6", "First back with lead", "Infinity Edge"]),
  Ashe: c("Ashe", "Marksman", "AD", "mid", "Utility marksman — perma-slow, engage/peel ult, safe scaling.", ["Level 6 (ult)", "Two items"]),
  MissFortune: c("Miss Fortune", "Marksman", "AD", "mid", "Lane pressure + teamfight ultimate.", ["Level 6 (Bullet Time)", "Lethality spike"], ["Marksman", "Burst"]),
  Sivir: c("Sivir", "Marksman", "AD", "mid", "Waveclear + engage tool with spellshield picks.", ["Level 6 (ult)", "Two items"]),
  Ezreal: c("Ezreal", "Marksman", "hybrid", "mid", "Poke + skirmish marksman that scales on Manamune.", ["Trinity Force / Manamune", "Level 6"], ["Marksman", "Artillery"]),
  "Kai'Sa": c("Kai'Sa", "Marksman", "hybrid", "late", "Flex carry that dives the backline once evolved.", ["Item evolutions", "Level 6 (R)"], ["Marksman", "Assassin"]),
  Vayne: c("Vayne", "Marksman", "AD", "late", "Late-game duelist that melts tanks with % true damage.", ["Blade of the Ruined King", "Three items"], ["Marksman", "Skirmisher"]),
  Twitch: c("Twitch", "Marksman", "AD", "late", "Ambush carry that flanks from stealth and spreads damage.", ["Runaan's spike", "Level 6 (ult)"]),
  Jhin: c("Jhin", "Marksman", "AD", "mid", "Burst + zone control with 4th-shot execute and root traps.", ["Lethality item", "Level 6 (Curtain Call)"], ["Marksman", "Burst"]),
  Lucian: c("Lucian", "Marksman", "AD", "early", "Early-game lane dominator that snowballs before falloff.", ["Level 1-3", "Two items"], ["Marksman", "Skirmisher"]),
  Draven: c("Draven", "Marksman", "AD", "early", "Snowball lane — convert Adoration gold into a lead.", ["Level 1 axes", "First back"]),
  Tristana: c("Tristana", "Marksman", "AD", "late", "All-in diver with reset jumps in fights.", ["Level 6 (reset)", "Two items"], ["Marksman", "Diver"]),
  Zeri: c("Zeri", "Marksman", "hybrid", "late", "Mobile skirmisher that whittles down in prolonged fights.", ["Statikk/Firecannon", "Three items"], ["Marksman", "Skirmisher"]),
  Xayah: c("Xayah", "Marksman", "AD", "late", "Self-peel carry that banks feathers and ults enemy engage.", ["Level 6 (R)", "Two items"]),
  Samira: c("Samira", "Marksman", "AD", "mid", "Chaotic dive carry that ults when the fight collapses.", ["Level 6 (Inferno Trigger)", "Two items"], ["Marksman", "Diver"]),
  Aphelios: c("Aphelios", "Marksman", "AD", "late", "Weapon-cycle carry that scales hard around gun rotation.", ["Infinity Edge", "Three items"]),
  "Kog'Maw": c("Kog'Maw", "Marksman", "AD", "late", "Hyper-scaler that melts from max range with peel.", ["Guinsoo's + BotRK", "Three items"], ["Marksman", "Specialist"]),
  Nilah: c("Nilah", "Marksman", "AD", "late", "Melee duelist that all-ins with shroud + ult.", ["Blade of the Ruined King", "Level 6"], ["Marksman", "Skirmisher"]),
  Varus: c("Varus", "Marksman", "AD", "mid", "Poke + pick with chain-CC ultimate.", ["Lethality/Manamune", "Level 6"], ["Marksman", "Artillery"]),
  Smolder: c("Smolder", "Marksman", "AD", "late", "Stack-to-scale ranged execute.", ["225 Q stacks", "Three items"]),
  Kalista: c("Kalista", "Marksman", "AD", "early", "Kite-heavy early skirmisher with Rend spears.", ["Blade of the Ruined King", "Level 6 (ally ult)"], ["Marksman", "Skirmisher"]),
  Senna: c("Senna", "Marksman", "AD", "late", "Soul-stacking utility marksman with global range.", ["Soul stacks", "Two items"], ["Marksman", "Enchanter"]),
  Ziggs: c("Ziggs", "Mage", "AP", "mid", "Artillery mage played bot for siege and poke.", ["Luden's/Liandry's", "Level 6"], ["Mage", "Artillery"]),
  VelKoz: c("Vel'Koz", "Mage", "AP", "mid", "Long-range poke mage with true-damage ult.", ["Luden's", "Level 6"], ["Mage", "Artillery"]),
};

/**
 * Curated class tags for a broad champion pool. This is enough for the engine
 * to reason about enemy compositions (AD/AP/tank/dive/CC) even when a champion
 * has no full identity record yet. Later, Data Dragon fills the identity map
 * and this can be derived from it.
 */
const THREAT_CLASSES: Record<string, ChampionClass[]> = {
  Zed: ["Assassin"], Talon: ["Assassin"], Katarina: ["Assassin", "Mage"], Akali: ["Assassin"],
  Fizz: ["Assassin"], Kassadin: ["Assassin", "Mage"], "Kha'Zix": ["Assassin", "Diver"], Rengar: ["Assassin", "Diver"],
  Nocturne: ["Assassin", "Diver"], Diana: ["Assassin", "Diver"], Evelynn: ["Assassin"], Yasuo: ["Skirmisher", "Diver"],
  Yone: ["Skirmisher", "Diver"], Irelia: ["Skirmisher", "Diver"], Camille: ["Diver", "Skirmisher"],
  Malphite: ["Vanguard", "Tank"], Leona: ["Vanguard", "Tank"], Nautilus: ["Vanguard", "Tank"], Rell: ["Vanguard", "Tank"],
  Alistar: ["Vanguard", "Tank"], Thresh: ["Catcher"], Blitzcrank: ["Catcher"], Pyke: ["Assassin", "Catcher"],
  Amumu: ["Vanguard", "Tank"], Sejuani: ["Vanguard", "Tank"], Zac: ["Vanguard", "Tank"], Ornn: ["Juggernaut", "Tank"],
  Sion: ["Juggernaut", "Tank"], Maokai: ["Vanguard", "Tank"], Rammus: ["Warden", "Tank"], JarvanIV: ["Diver", "Vanguard"],
  Vi: ["Diver"], Wukong: ["Diver", "Skirmisher"],
  Xerath: ["Artillery", "Mage"], Zoe: ["Burst", "Mage"], Lux: ["Burst", "Mage"], Jayce: ["Artillery", "Fighter"],
  Nidalee: ["Assassin", "Mage"], Karma: ["Enchanter", "Mage"], Morgana: ["Catcher", "Mage"], Zyra: ["Catcher", "Mage"],
  Brand: ["Burst", "Mage"], Syndra: ["Burst", "Mage"], Orianna: ["Burst", "Mage"], Viktor: ["Battlemage", "Mage"],
  Ahri: ["Burst", "Assassin"], Lulu: ["Enchanter"], Janna: ["Enchanter"], Nami: ["Enchanter"], Soraka: ["Enchanter"],
  Yuumi: ["Enchanter"], Milio: ["Enchanter"], Renata: ["Enchanter", "Catcher"],
  Darius: ["Juggernaut"], Garen: ["Juggernaut"], Sett: ["Juggernaut", "Diver"], Mordekaiser: ["Juggernaut", "Battlemage"],
  Fiora: ["Skirmisher"], Jax: ["Skirmisher", "Diver"], ChoGath: ["Battlemage", "Tank"],
};

/** Enemy champions with meaningful healing/sustain (anti-heal cue). */
const HEAL_SOURCES = new Set<string>([
  "Soraka", "Yuumi", "Nami", "Milio", "Vayne", "Aatrox", "Sylas", "Vladimir",
  "Warwick", "Dr. Mundo", "Swain", "Zac", "Fiora", "Sett", "Nilah", "Senna",
]);

// --- item / rune / summoner metadata ---------------------------------------

/** Broad item category taxonomy (category-level, not individual items). */
export type ItemCategory =
  | "crit"
  | "on-hit"
  | "lethality"
  | "armor-pen"
  | "magic-pen"
  | "ability-power"
  | "anti-heal"
  | "magic-resist"
  | "armor"
  | "survivability"
  | "anti-burst"
  | "lifesteal"
  | "utility";

export interface ItemCategoryMeta {
  category: ItemCategory;
  label: string;
  /** Which champion damage profiles this category is *offensively* valid for.
   *  Defensive categories accept any profile. */
  compatibleWith: DamageProfile[];
  /** Example items — illustrative only, never a build recommendation. */
  examples: string[];
  source: KnowledgeSource;
}

const ITEM_CATEGORIES: Record<ItemCategory, ItemCategoryMeta> = {
  crit: cat("crit", "Critical strike", ["AD"], ["Infinity Edge", "The Collector", "Rapid Firecannon"]),
  "on-hit": cat("on-hit", "On-hit", ["AD", "hybrid"], ["Blade of the Ruined King", "Guinsoo's Rageblade", "Wit's End"]),
  lethality: cat("lethality", "Lethality", ["AD"], ["Serylda's Grudge", "Youmuu's Ghostblade"]),
  "armor-pen": cat("armor-pen", "Armor penetration", ["AD", "hybrid"], ["Lord Dominik's Regards", "Serylda's Grudge"]),
  "magic-pen": cat("magic-pen", "Magic penetration", ["AP", "hybrid"], ["Void Staff", "Sorcerer's Shoes"]),
  "ability-power": cat("ability-power", "Ability power", ["AP", "hybrid"], ["Rabadon's Deathcap", "Nashor's Tooth"]),
  "anti-heal": cat("anti-heal", "Grievous Wounds (anti-heal)", ["AD", "AP", "hybrid", "true", "unknown"], ["Mortal Reminder", "Morellonomicon"]),
  "magic-resist": cat("magic-resist", "Magic resist", ["AD", "AP", "hybrid", "true", "unknown"], ["Mercury's Treads", "Maw of Malmortius", "Wit's End"]),
  armor: cat("armor", "Armor", ["AD", "AP", "hybrid", "true", "unknown"], ["Plated Steelcaps", "Guardian Angel"]),
  survivability: cat("survivability", "Survivability", ["AD", "AP", "hybrid", "true", "unknown"], ["Guardian Angel", "Bloodthirster (shield)"]),
  "anti-burst": cat("anti-burst", "Anti-burst", ["AD", "AP", "hybrid", "true", "unknown"], ["Maw of Malmortius", "Edge of Night", "Banshee's Veil"]),
  lifesteal: cat("lifesteal", "Lifesteal / sustain", ["AD", "hybrid"], ["Bloodthirster", "Blade of the Ruined King"]),
  utility: cat("utility", "Utility", ["AD", "AP", "hybrid", "true", "unknown"], ["Zeke's Convergence", "Redemption"]),
};

export type RuneCategory = "precision" | "domination" | "sorcery" | "resolve" | "inspiration";

export const RUNE_CATEGORIES: Record<RuneCategory, { label: string; theme: string; source: KnowledgeSource }> = {
  precision: { label: "Precision", theme: "Sustained damage & attack speed", source: "curated" },
  domination: { label: "Domination", theme: "Burst & target access", source: "curated" },
  sorcery: { label: "Sorcery", theme: "Ability power & utility", source: "curated" },
  resolve: { label: "Resolve", theme: "Durability & defense", source: "curated" },
  inspiration: { label: "Inspiration", theme: "Creative tools & economy", source: "curated" },
};

export type SummonerSpellId =
  | "flash" | "heal" | "barrier" | "cleanse" | "exhaust" | "ghost" | "ignite" | "teleport" | "smite";

export const SUMMONER_SPELLS: Record<SummonerSpellId, { label: string; use: string; source: KnowledgeSource }> = {
  flash: { label: "Flash", use: "Reposition / escape / engage", source: "curated" },
  heal: { label: "Heal", use: "Bot-lane sustain & tempo", source: "curated" },
  barrier: { label: "Barrier", use: "Anti-burst shield", source: "curated" },
  cleanse: { label: "Cleanse", use: "Remove hard CC", source: "curated" },
  exhaust: { label: "Exhaust", use: "Slow & damage-reduce a threat", source: "curated" },
  ghost: { label: "Ghost", use: "Sustained move speed", source: "curated" },
  ignite: { label: "Ignite", use: "Kill pressure & anti-heal", source: "curated" },
  teleport: { label: "Teleport", use: "Map presence & recovery", source: "curated" },
  smite: { label: "Smite", use: "Jungle clear & objective secure", source: "curated" },
};

// --- accessors (the ONLY way consumers should read metadata) ----------------

export function getChampion(id: string): ChampionIdentity | null {
  return CHAMPIONS[id] ?? null;
}

export function championClasses(id: string): ChampionClass[] {
  return CHAMPIONS[id]?.classes ?? THREAT_CLASSES[id] ?? [];
}

export function championDamageProfile(id: string): DamageProfile {
  const known = CHAMPIONS[id];
  if (known) return known.damageProfile;
  // Fall back to a coarse profile from class tags for enemies without an
  // identity record. Only confident when the class strongly implies a profile.
  const classes = THREAT_CLASSES[id];
  if (!classes) return "unknown";
  const ap = classes.some((k) => k === "Mage" || k === "Battlemage" || k === "Artillery" || k === "Burst" || k === "Enchanter");
  const ad = classes.some((k) => k === "Marksman" || k === "Fighter" || k === "Juggernaut" || k === "Skirmisher");
  if (ap && !ad) return "AP";
  if (ad && !ap) return "AD";
  return "unknown";
}

export function championRoles(id: string): LeagueRole[] {
  return CHAMPIONS[id]?.roles ?? [];
}

export function championScaling(id: string): ScalingTier {
  return CHAMPIONS[id]?.scaling ?? "unknown";
}

export function championPowerSpikes(id: string): string[] {
  return CHAMPIONS[id]?.powerSpikes ?? [];
}

export function championWinCondition(id: string): string | null {
  return CHAMPIONS[id]?.winCondition ?? null;
}

export function championPlaystyle(id: string): string | null {
  return CHAMPIONS[id]?.playstyle ?? null;
}

/** Do we have a confident identity record for this champion? */
export function hasChampionIdentity(id: string): boolean {
  return Boolean(CHAMPIONS[id]);
}

export function isHealSource(id: string): boolean {
  return HEAL_SOURCES.has(id);
}

export function getItemCategory(category: ItemCategory): ItemCategoryMeta {
  return ITEM_CATEGORIES[category];
}

/** Is an item category offensively/defensively valid for a damage profile? */
export function isItemCategoryCompatible(category: ItemCategory, profile: DamageProfile): boolean {
  if (profile === "unknown") return false;
  return ITEM_CATEGORIES[category].compatibleWith.includes(profile);
}

// --- future Data Dragon entry point (inert today) --------------------------
/**
 * Placeholder for the future Riot Data Dragon integration. When wired, this
 * will replace/augment the curated maps above and flip `source` to
 * "datadragon". Kept as a no-op so the architecture is ready without changing
 * any consumer. DO NOT connect Data Dragon here yet.
 */
export function hydrateFromDataDragon(): void {
  // Intentionally empty — see Sprint plan (Data Dragon deferred).
}

// --- seed helpers -----------------------------------------------------------

function c(
  name: string,
  primaryClass: ChampionClass,
  damageProfile: DamageProfile,
  scaling: ScalingTier,
  identity: string,
  powerSpikes: string[] = [],
  classes: ChampionClass[] = [primaryClass],
): ChampionIdentity {
  return {
    id: name.replace(/['\s.]/g, ""),
    name,
    identity,
    classes,
    damageProfile,
    roles: ["adc"],
    scaling,
    powerSpikes,
    playstyle: identity,
    source: "curated",
  };
}

function cat(
  category: ItemCategory,
  label: string,
  compatibleWith: DamageProfile[],
  examples: string[],
): ItemCategoryMeta {
  return { category, label, compatibleWith, examples, source: "curated" };
}

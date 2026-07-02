// ---------------------------------------------------------------------------
// RiotAssetService — the single source of truth for every Riot / Data Dragon
// asset URL used across BotDiff.
//
// No UI component should ever build a Data Dragon URL by hand. Import the
// `riotAssets` singleton (or the `useRiotAssets()` hook) and ask it for the
// asset you need. The service:
//   • auto-detects the current Data Dragon patch version
//   • loads and caches champion / summoner-spell / rune metadata
//   • persists everything to localStorage keyed by patch, so a new Riot patch
//     transparently refreshes every asset the next time the app loads
//   • degrades gracefully with a sensible fallback version + name normaliser
//
// It is intentionally framework-agnostic: pure functions + a tiny external
// store. `use-riot-assets.ts` wraps it for React.
// ---------------------------------------------------------------------------

const DDRAGON = "https://ddragon.leagueoflegends.com/cdn";
const COMMUNITY_DRAGON =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default";
const FALLBACK_VERSION = "14.24.1";
const CACHE_PREFIX = "botdiff:ddragon:";

// --- metadata shapes -------------------------------------------------------

interface ChampionMeta {
  id: string; // Data Dragon id, e.g. "Kaisa", "MonkeyKing"
  key: string; // numeric key as string, e.g. "145"
  name: string; // display name, e.g. "Kai'Sa"
}

interface RuneMeta {
  id: number;
  key: string;
  name: string;
  icon: string; // relative path within ddragon img/
}

interface RuneTree {
  id: number;
  key: string;
  name: string;
  icon: string;
  slots: { runes: RuneMeta[] }[];
}

interface AssetState {
  version: string;
  loaded: boolean;
  championsByName: Map<string, ChampionMeta>;
  championsByKey: Map<string, ChampionMeta>;
  spellsByKey: Map<string, string>; // numeric key -> spell id ("SummonerFlash")
  runesById: Map<number, RuneMeta>;
  runeTreesById: Map<number, RuneTree>;
}

const state: AssetState = {
  version: FALLBACK_VERSION,
  loaded: false,
  championsByName: new Map(),
  championsByKey: new Map(),
  spellsByKey: new Map(),
  runesById: new Map(),
  runeTreesById: new Map(),
};

// --- tiny external store (framework agnostic) ------------------------------

const listeners = new Set<() => void>();
let snapshot = 0;
function emit() {
  snapshot++;
  for (const l of listeners) l();
}
export function subscribeAssets(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getAssetsSnapshot(): number {
  return snapshot;
}

// --- champion id normalisation --------------------------------------------

// Explicit map for names that Data Dragon spells differently from the display
// name. Used as a fallback before metadata finishes loading.
const MANUAL_IDS: Record<string, string> = {
  Wukong: "MonkeyKing",
  "Nunu & Willump": "Nunu",
  "Renata Glasc": "Renata",
  "Dr. Mundo": "DrMundo",
  "Kai'Sa": "Kaisa",
  "Kha'Zix": "Khazix",
  "Cho'Gath": "Chogath",
  "Vel'Koz": "Velkoz",
  "Rek'Sai": "RekSai",
  "Bel'Veth": "Belveth",
  "Kog'Maw": "KogMaw",
  LeBlanc: "Leblanc",
  "Master Yi": "MasterYi",
  "Miss Fortune": "MissFortune",
  "Twisted Fate": "TwistedFate",
  "Xin Zhao": "XinZhao",
  "Jarvan IV": "JarvanIV",
  "Lee Sin": "LeeSin",
  "Aurelion Sol": "AurelionSol",
  "Tahm Kench": "TahmKench";
};

/** Resolve a champion display name (or already-normalised id) to a DDragon id. */
export function championId(name: string | null | undefined): string {
  if (!name) return "";
  const meta = state.championsByName.get(name.toLowerCase());
  if (meta) return meta.id;
  if (MANUAL_IDS[name]) return MANUAL_IDS[name];
  // Fallback: strip punctuation & spaces (works for the common case).
  return name.replace(/[^A-Za-z0-9]/g, "");
}

// --- the service -----------------------------------------------------------

export const riotAssets = {
  get version() {
    return state.version;
  },
  get ready() {
    return state.loaded;
  },

  championId,

  /** 120×120 champion square icon (used for lists, cards, avatars). */
  championSquare(name: string): string {
    return `${DDRAGON}/${state.version}/img/champion/${championId(name)}.png`;
  },

  /** Full-resolution splash art — for blurred backgrounds. `skin` defaults to 0. */
  championSplash(name: string, skin = 0): string {
    return `${DDRAGON}/img/champion/splash/${championId(name)}_${skin}.jpg`;
  },

  /** Loading-screen portrait (tall) art. */
  championLoading(name: string, skin = 0): string {
    return `${DDRAGON}/img/champion/loading/${championId(name)}_${skin}.jpg`;
  },

  /** Riot profile icon by numeric icon id. */
  profileIcon(iconId: number | string): string {
    return `${DDRAGON}/${state.version}/img/profileicon/${iconId}.png`;
  },

  /** Item icon by numeric item id. */
  item(itemId: number | string): string {
    return `${DDRAGON}/${state.version}/img/item/${itemId}.png`;
  },

  /** Summoner spell icon. Accepts a numeric key (from match-v5) or a spell id. */
  summonerSpell(spell: number | string): string {
    const id = state.spellsByKey.get(String(spell)) ?? String(spell);
    return `${DDRAGON}/${state.version}/img/spell/${id}.png`;
  },

  /** Individual rune (perk) icon by rune id, e.g. 8005 (Press the Attack). */
  rune(runeId: number): string {
    const meta = state.runesById.get(runeId);
    const tree = state.runeTreesById.get(runeId);
    const icon = meta?.icon ?? tree?.icon;
    if (icon) return `${DDRAGON}/img/${icon}`;
    return "";
  },

  /** Rune-tree (path) icon, e.g. Precision / Domination. */
  runeTree(treeId: number): string {
    const tree = state.runeTreesById.get(treeId);
    return tree ? `${DDRAGON}/img/${tree.icon}` : "";
  },

  runeName(runeId: number): string {
    return state.runesById.get(runeId)?.name ?? state.runeTreesById.get(runeId)?.name ?? "";
  },

  /** Official ranked emblem (Community Dragon, patch-independent). */
  rankEmblem(tier: string): string {
    const t = (tier || "").toLowerCase();
    if (!t || t === "unranked") return `${COMMUNITY_DRAGON}/images/ranked-emblem/emblem-unranked.png`;
    return `${COMMUNITY_DRAGON}/images/ranked-emblem/emblem-${t}.png`;
  },

  /** Small ranked mini-crest, nicer for inline chips. */
  rankMiniCrest(tier: string): string {
    const t = (tier || "unranked").toLowerCase();
    return `${COMMUNITY_DRAGON}/images/ranked-mini-crests/${t}.svg`;
  },
} as const;

export type RiotAssetService = typeof riotAssets;

// --- loading / caching -----------------------------------------------------

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — ignore, we still have in-memory data */
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function ingestChampions(data: Record<string, ChampionMeta>) {
  for (const meta of Object.values(data)) {
    state.championsByName.set(meta.name.toLowerCase(), meta);
    state.championsByKey.set(String(meta.key), meta);
  }
}
function ingestSpells(data: Record<string, { id: string; key: string }>) {
  for (const spell of Object.values(data)) {
    state.spellsByKey.set(String(spell.key), spell.id);
  }
}
function ingestRunes(trees: RuneTree[]) {
  for (const tree of trees) {
    state.runeTreesById.set(tree.id, tree);
    for (const slot of tree.slots) {
      for (const rune of slot.runes) state.runesById.set(rune.id, rune);
    }
  }
}

let loadPromise: Promise<void> | null = null;

/** Idempotently detect the patch and load all metadata (cached per patch). */
export function loadRiotAssets(): Promise<void> {
  if (state.loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
  if (typeof window === "undefined") return Promise.resolve();

  loadPromise = (async () => {
    // 1) Detect current patch version.
    const versions = await fetchJson<string[]>(
      "https://ddragon.leagueoflegends.com/api/versions.json",
    );
    const version = versions?.[0] ?? readCache<string>("version") ?? FALLBACK_VERSION;
    state.version = version;
    writeCache("version", version);

    // 2) Load per-patch metadata, preferring cache keyed by the exact patch so
    //    a new Riot patch invalidates stale data automatically.
    const champKey = `champions:${version}`;
    const spellKey = `spells:${version}`;
    const runeKey = `runes:${version}`;

    const cachedChamps = readCache<Record<string, ChampionMeta>>(champKey);
    const cachedSpells = readCache<Record<string, { id: string; key: string }>>(spellKey);
    const cachedRunes = readCache<RuneTree[]>(runeKey);

    const [champs, spells, runes] = await Promise.all([
      cachedChamps
        ? Promise.resolve({ data: cachedChamps })
        : fetchJson<{ data: Record<string, ChampionMeta> }>(
            `${DDRAGON}/${version}/data/en_US/champion.json`,
          ),
      cachedSpells
        ? Promise.resolve({ data: cachedSpells })
        : fetchJson<{ data: Record<string, { id: string; key: string }> }>(
            `${DDRAGON}/${version}/data/en_US/summoner.json`,
          ),
      cachedRunes
        ? Promise.resolve(cachedRunes)
        : fetchJson<RuneTree[]>(`${DDRAGON}/${version}/data/en_US/runesReforged.json`),
    ]);

    if (champs?.data) {
      ingestChampions(champs.data);
      if (!cachedChamps) writeCache(champKey, champs.data);
    }
    if (spells?.data) {
      ingestSpells(spells.data);
      if (!cachedSpells) writeCache(spellKey, spells.data);
    }
    if (runes) {
      ingestRunes(runes);
      if (!cachedRunes) writeCache(runeKey, runes);
    }

    state.loaded = true;
    emit();
  })();

  return loadPromise;
}

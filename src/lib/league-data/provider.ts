// ---------------------------------------------------------------------------
// DataDragonProvider — the ONLY module in BotDiff that talks to Riot's
// Data Dragon CDN.
//
//   League Data Providers → Data Dragon Provider → Champion Intelligence
//   → Coach Engine
//
// Responsibilities (facts only — never coaching):
//   • automatic patch detection + version tracking
//   • fetch + normalise champions / items / runes / summoner spells
//   • two-tier caching keyed by patch (memory + localStorage)
//   • graceful fallback when Riot services are unavailable
//   • every asset URL in the app
//
// Pure data. No recommendations, no builds, no evaluation.
// ---------------------------------------------------------------------------
import { cacheKey, pruneCache, readCache, writeCache, clearCache } from "./cache";
import type {
  ChampionAbilityMeta,
  ChampionAssets,
  ChampionData,
  DDChampionDetail,
  DDChampionSummary,
  DDItemPayload,
  DDRuneTreePayload,
  DDSpellPayload,
  DDSummonerSpellPayload,
  ItemData,
  LeagueDataSnapshot,
  OfficialRangeType,
  OfficialResourceType,
  RuneData,
  RuneTreeData,
  SummonerSpellData,
} from "./types";

export const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn";
export const DDRAGON_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json";
export const COMMUNITY_DRAGON =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default";

/** Last known-good patch, used only when Riot is unreachable. */
export const FALLBACK_PATCH = "14.24.1";
export const DEFAULT_LOCALE = "en_US";

// --- state -----------------------------------------------------------------

interface ProviderState {
  patch: string;
  locale: string;
  ready: boolean;
  degraded: boolean;
  lastLoadedAt: string | null;
  championsById: Map<string, ChampionData>;
  championsByKey: Map<string, ChampionData>;
  championsByName: Map<string, ChampionData>;
  itemsById: Map<string, ItemData>;
  runesById: Map<number, RuneData>;
  runeTreesById: Map<number, RuneTreeData>;
  spellsById: Map<string, SummonerSpellData>;
  spellsByKey: Map<string, SummonerSpellData>;
}

const state: ProviderState = {
  patch: FALLBACK_PATCH,
  locale: DEFAULT_LOCALE,
  ready: false,
  degraded: false,
  lastLoadedAt: null,
  championsById: new Map(),
  championsByKey: new Map(),
  championsByName: new Map(),
  itemsById: new Map(),
  runesById: new Map(),
  runeTreesById: new Map(),
  spellsById: new Map(),
  spellsByKey: new Map(),
};

// --- subscription (framework agnostic external store) ----------------------

const listeners = new Set<() => void>();
const patchListeners = new Set<(patch: string, previous: string) => void>();
let revision = 0;

function emit() {
  revision += 1;
  for (const l of listeners) l();
}

export function subscribeLeagueData(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getLeagueDataRevision(): number {
  return revision;
}

/** Notified whenever automatic patch detection sees a NEW Riot patch. */
export function onPatchChange(cb: (patch: string, previous: string) => void): () => void {
  patchListeners.add(cb);
  return () => patchListeners.delete(cb);
}

// --- fetch helpers ---------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Cache-first JSON read. Returns `null` only when Riot is unreachable too. */
async function cachedJson<T>(resource: string, url: string): Promise<{ data: T; cached: boolean } | null> {
  const key = cacheKey(state.patch, resource, state.locale);
  const hit = readCache<T>(key);
  if (hit) return { data: hit, cached: true };
  const fresh = await fetchJson<T>(url);
  if (!fresh) return null;
  writeCache(key, fresh);
  return { data: fresh, cached: false };
}

function dataUrl(resource: string): string {
  return `${DDRAGON_CDN}/${state.patch}/data/${state.locale}/${resource}.json`;
}

// --- normalisation (Riot facts → repository shapes) ------------------------

const RESOURCE_MAP: Record<string, OfficialResourceType> = {
  mana: "mana",
  energy: "energy",
  fury: "fury",
  rage: "rage",
  health: "health",
  shield: "shield",
  heat: "heat",
  flow: "flow",
  grit: "grit",
  ferocity: "ferocity",
  "blood well": "blood well",
  courage: "courage",
  none: "none",
  "": "none",
};

function normaliseResource(partype: string | undefined): OfficialResourceType {
  const key = (partype ?? "").trim().toLowerCase();
  return RESOURCE_MAP[key] ?? "unknown";
}

/** Riot's own attackrange stat — 300+ is a ranged basic attack. */
function normaliseRange(attackRange: number | null): OfficialRangeType {
  if (attackRange === null || Number.isNaN(attackRange)) return "unknown";
  return attackRange >= 300 ? "ranged" : "melee";
}

const ABILITY_SLOTS = ["Q", "W", "E", "R"] as const;

function abilityFrom(spell: DDSpellPayload, slot: "Q" | "W" | "E" | "R"): ChampionAbilityMeta {
  return {
    slot,
    id: spell.id,
    name: spell.name,
    description: spell.description ?? "",
    icon: spell.image?.full ? `${DDRAGON_CDN}/${state.patch}/img/spell/${spell.image.full}` : "",
    maxRank: spell.maxrank,
    cooldown: spell.cooldownBurn,
    cost: spell.costBurn,
    range: spell.rangeBurn,
    resource: spell.resource ?? spell.costType,
  };
}

function championAssets(id: string, detail: DDChampionDetail): ChampionAssets {
  const abilityIcons: Record<string, string> = {};
  (detail.spells ?? []).forEach((spell, i) => {
    const slot = ABILITY_SLOTS[i];
    if (!slot || !spell.image?.full) return;
    abilityIcons[slot] = `${DDRAGON_CDN}/${state.patch}/img/spell/${spell.image.full}`;
  });
  return {
    square: `${DDRAGON_CDN}/${state.patch}/img/champion/${id}.png`,
    splash: `${DDRAGON_CDN}/img/champion/splash/${id}_0.jpg`,
    loading: `${DDRAGON_CDN}/img/champion/loading/${id}_0.jpg`,
    centered: `https://cdn.communitydragon.org/latest/champion/${detail.key}/splash-art/centered`,
    passiveIcon: detail.passive?.image?.full
      ? `${DDRAGON_CDN}/${state.patch}/img/passive/${detail.passive.image.full}`
      : "",
    abilityIcons,
  };
}

function toChampionData(summary: DDChampionSummary, detail?: DDChampionDetail): ChampionData {
  const full: DDChampionDetail = { ...summary, ...(detail ?? {}) };
  const stats = full.stats ?? {};
  const attackRange = typeof stats.attackrange === "number" ? stats.attackrange : null;
  const abilities = (full.spells ?? [])
    .slice(0, 4)
    .map((spell, i) => abilityFrom(spell, ABILITY_SLOTS[i] ?? "Q"));
  const passive: ChampionAbilityMeta | null = full.passive
    ? {
        slot: "P",
        id: `${full.id}Passive`,
        name: full.passive.name,
        description: full.passive.description ?? "",
        icon: full.passive.image?.full
          ? `${DDRAGON_CDN}/${state.patch}/img/passive/${full.passive.image.full}`
          : "",
      }
    : null;
  const tags = full.tags ?? [];
  return {
    id: full.id,
    key: String(full.key),
    name: full.name,
    title: full.title ?? "",
    tags,
    classes: tags,
    resourceType: normaliseResource(full.partype),
    rangeType: normaliseRange(attackRange),
    attackRange,
    info: full.info ?? null,
    stats,
    lore: full.lore ?? "",
    passive,
    abilities,
    assets: championAssets(full.id, full),
    patch: state.patch,
  };
}

function indexChampion(champ: ChampionData) {
  state.championsById.set(champ.id.toLowerCase(), champ);
  state.championsByKey.set(champ.key, champ);
  state.championsByName.set(champ.name.toLowerCase(), champ);
}

function toItemData(id: string, payload: DDItemPayload): ItemData {
  return {
    id,
    name: payload.name,
    plaintext: payload.plaintext ?? "",
    description: payload.description ?? "",
    tags: payload.tags ?? [],
    stats: payload.stats ?? {},
    gold: payload.gold ?? { total: 0, base: 0, sell: 0, purchasable: false },
    icon: `${DDRAGON_CDN}/${state.patch}/img/item/${payload.image?.full ?? `${id}.png`}`,
    from: payload.from ?? [],
    into: payload.into ?? [],
    depth: payload.depth ?? 1,
    patch: state.patch,
  };
}

function ingestRuneTrees(trees: DDRuneTreePayload[]) {
  for (const tree of trees) {
    const runes: RuneData[] = [];
    tree.slots.forEach((slot, slotIndex) => {
      for (const rune of slot.runes) {
        const record: RuneData = {
          id: rune.id,
          key: rune.key,
          name: rune.name,
          shortDesc: rune.shortDesc ?? "",
          longDesc: rune.longDesc ?? "",
          icon: `${DDRAGON_CDN}/img/${rune.icon}`,
          treeId: tree.id,
          treeKey: tree.key,
          treeName: tree.name,
          slot: slotIndex,
          patch: state.patch,
        };
        runes.push(record);
        state.runesById.set(record.id, record);
      }
    });
    state.runeTreesById.set(tree.id, {
      id: tree.id,
      key: tree.key,
      name: tree.name,
      icon: `${DDRAGON_CDN}/img/${tree.icon}`,
      keystones: runes.filter((r) => r.slot === 0),
      runes,
      patch: state.patch,
    });
  }
}

function toSummonerSpell(payload: DDSummonerSpellPayload): SummonerSpellData {
  return {
    id: payload.id,
    key: String(payload.key),
    name: payload.name,
    description: payload.description ?? "",
    cooldown: payload.cooldownBurn ?? "",
    icon: `${DDRAGON_CDN}/${state.patch}/img/spell/${payload.image?.full ?? `${payload.id}.png`}`,
    modes: payload.modes ?? [],
    patch: state.patch,
  };
}

// --- version tracking / automatic patch detection -------------------------

const PATCH_CACHE_KEY = "patch:latest";

/**
 * Detect the live Riot patch. Falls back to the last cached patch and finally
 * to `FALLBACK_PATCH` when Riot is unreachable, flagging `degraded`.
 */
export async function detectPatch(): Promise<string> {
  const versions = await fetchJson<string[]>(DDRAGON_VERSIONS);
  const live = versions?.[0];
  if (live) {
    writeCache(PATCH_CACHE_KEY, live);
    state.degraded = false;
    return live;
  }
  state.degraded = true;
  return readCache<string>(PATCH_CACHE_KEY) ?? FALLBACK_PATCH;
}

function applyPatch(next: string) {
  const previous = state.patch;
  if (next === previous) return;
  state.patch = next;
  // A new patch invalidates every derived record + cached payload.
  state.championsById.clear();
  state.championsByKey.clear();
  state.championsByName.clear();
  state.itemsById.clear();
  state.runesById.clear();
  state.runeTreesById.clear();
  state.spellsById.clear();
  state.spellsByKey.clear();
  pruneCache(next);
  for (const l of patchListeners) l(next, previous);
}

// --- loading --------------------------------------------------------------

let loadPromise: Promise<LeagueDataSnapshot> | null = null;

async function loadCore(): Promise<LeagueDataSnapshot> {
  applyPatch(await detectPatch());

  const [champions, items, runes, spells] = await Promise.all([
    cachedJson<{ data: Record<string, DDChampionSummary> }>("champion", dataUrl("champion")),
    cachedJson<{ data: Record<string, DDItemPayload> }>("item", dataUrl("item")),
    cachedJson<DDRuneTreePayload[]>("runesReforged", dataUrl("runesReforged")),
    cachedJson<{ data: Record<string, DDSummonerSpellPayload> }>("summoner", dataUrl("summoner")),
  ]);

  if (champions?.data.data) {
    for (const summary of Object.values(champions.data.data)) {
      indexChampion(toChampionData(summary));
    }
  } else {
    state.degraded = true;
  }

  if (items?.data.data) {
    for (const [id, payload] of Object.entries(items.data.data)) {
      state.itemsById.set(id, toItemData(id, payload));
    }
  } else {
    state.degraded = true;
  }

  if (runes?.data) ingestRuneTrees(runes.data);
  else state.degraded = true;

  if (spells?.data.data) {
    for (const payload of Object.values(spells.data.data)) {
      const record = toSummonerSpell(payload);
      state.spellsById.set(record.id, record);
      state.spellsByKey.set(record.key, record);
    }
  } else {
    state.degraded = true;
  }

  state.ready = true;
  state.lastLoadedAt = new Date().toISOString();
  emit();
  return snapshot();
}

/** Idempotent. Safe to call from anywhere, any number of times. */
export function loadLeagueData(): Promise<LeagueDataSnapshot> {
  if (state.ready) return Promise.resolve(snapshot());
  if (loadPromise) return loadPromise;
  loadPromise = loadCore().catch(() => {
    // Riot unreachable AND no cache: stay usable, just empty + degraded.
    state.degraded = true;
    state.ready = true;
    emit();
    return snapshot();
  });
  return loadPromise;
}

/**
 * Re-check Riot for a newer patch. When one exists, caches are invalidated and
 * every repository is reloaded. Returns true when the patch changed.
 */
export async function refreshPatch(): Promise<boolean> {
  const next = await detectPatch();
  if (next === state.patch && state.ready) return false;
  applyPatch(next);
  state.ready = false;
  loadPromise = null;
  await loadLeagueData();
  return true;
}

/** Full reset — used by tests and by an explicit "reload League data" action. */
export function resetLeagueData(options: { clearStorage?: boolean } = {}): void {
  if (options.clearStorage) clearCache();
  state.ready = false;
  state.degraded = false;
  state.lastLoadedAt = null;
  loadPromise = null;
  applyPatch(FALLBACK_PATCH);
  emit();
}

/** Load a champion's full detail payload (abilities + passive + lore). */
export async function loadChampionDetail(championId: string): Promise<ChampionData | null> {
  await loadLeagueData();
  const existing = resolveChampion(championId);
  if (!existing) return null;
  if (existing.abilities.length > 0) return existing;
  const payload = await cachedJson<{ data: Record<string, DDChampionDetail> }>(
    `champion:${existing.id}`,
    `${DDRAGON_CDN}/${state.patch}/data/${state.locale}/champion/${existing.id}.json`,
  );
  const detail = payload?.data.data?.[existing.id];
  if (!detail) return existing;
  const merged = toChampionData(detail, detail);
  indexChampion(merged);
  emit();
  return merged;
}

// --- reads ----------------------------------------------------------------

/** Accepts a Data Dragon id, display name, or numeric Riot key. */
export function resolveChampion(idOrNameOrKey: string | number): ChampionData | null {
  const raw = String(idOrNameOrKey ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return (
    state.championsById.get(lower) ??
    state.championsByName.get(lower) ??
    state.championsByKey.get(raw) ??
    state.championsById.get(lower.replace(/[^a-z0-9]/g, "")) ??
    null
  );
}

export function allChampions(): ChampionData[] {
  return Array.from(state.championsById.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveItem(itemId: string | number): ItemData | null {
  return state.itemsById.get(String(itemId)) ?? null;
}

export function allItems(): ItemData[] {
  return Array.from(state.itemsById.values());
}

export function resolveRune(runeId: number): RuneData | null {
  return state.runesById.get(runeId) ?? null;
}

export function allRunes(): RuneData[] {
  return Array.from(state.runesById.values());
}

export function resolveRuneTree(treeId: number): RuneTreeData | null {
  return state.runeTreesById.get(treeId) ?? null;
}

export function allRuneTrees(): RuneTreeData[] {
  return Array.from(state.runeTreesById.values());
}

export function resolveSummonerSpell(spell: string | number): SummonerSpellData | null {
  const raw = String(spell ?? "");
  return state.spellsById.get(raw) ?? state.spellsByKey.get(raw) ?? null;
}

export function allSummonerSpells(): SummonerSpellData[] {
  return Array.from(state.spellsById.values());
}

export function currentPatch(): string {
  return state.patch;
}

export function isReady(): boolean {
  return state.ready;
}

export function isDegraded(): boolean {
  return state.degraded;
}

export function currentLocale(): string {
  return state.locale;
}

export function setLocale(locale: string): void {
  if (locale === state.locale) return;
  state.locale = locale;
  state.ready = false;
  loadPromise = null;
  emit();
}

export function snapshot(): LeagueDataSnapshot {
  return {
    patch: state.patch,
    ready: state.ready,
    degraded: state.degraded,
    champions: state.championsById.size,
    items: state.itemsById.size,
    runes: state.runesById.size,
    summonerSpells: state.spellsById.size,
    lastLoadedAt: state.lastLoadedAt,
  };
}

/** The reusable provider facade. Every repository is built on top of this. */
export const DataDragonProvider = {
  load: loadLeagueData,
  refreshPatch,
  detectPatch,
  reset: resetLeagueData,
  snapshot,
  subscribe: subscribeLeagueData,
  onPatchChange,
  patch: currentPatch,
  locale: currentLocale,
  setLocale,
  ready: isReady,
  degraded: isDegraded,
  champion: resolveChampion,
  championDetail: loadChampionDetail,
  champions: allChampions,
  item: resolveItem,
  items: allItems,
  rune: resolveRune,
  runes: allRunes,
  runeTree: resolveRuneTree,
  runeTrees: allRuneTrees,
  summonerSpell: resolveSummonerSpell,
  summonerSpells: allSummonerSpells,
} as const;

export type DataDragonProviderFacade = typeof DataDragonProvider;
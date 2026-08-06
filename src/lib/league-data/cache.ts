// ---------------------------------------------------------------------------
// League Data cache — two tiers, both keyed by patch.
//
//   1. in-memory Map (fast, per session, works during SSR)
//   2. localStorage (survives reloads; automatically stale-proof because the
//      patch is part of every key, so a new Riot patch invalidates itself)
//
// Never throws: storage may be full, disabled or absent.
// ---------------------------------------------------------------------------

const PREFIX = "botdiff:leaguedata:";

const memory = new Map<string, unknown>();

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function cacheKey(patch: string, resource: string, locale = "en_US"): string {
  return `${patch}:${locale}:${resource}`;
}

export function readCache<T>(key: string): T | null {
  if (memory.has(key)) return memory.get(key) as T;
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  memory.set(key, value);
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode — in-memory tier still serves this session */
  }
}

/** Drop every cached entry that does NOT belong to `keepPatch`. */
export function pruneCache(keepPatch: string): void {
  for (const key of Array.from(memory.keys())) {
    if (!key.startsWith(`${keepPatch}:`)) memory.delete(key);
  }
  if (!hasStorage()) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const raw = window.localStorage.key(i);
      if (!raw?.startsWith(PREFIX)) continue;
      if (!raw.startsWith(`${PREFIX}${keepPatch}:`)) doomed.push(raw);
    }
    for (const k of doomed) window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export function clearCache(): void {
  memory.clear();
  if (!hasStorage()) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const raw = window.localStorage.key(i);
      if (raw?.startsWith(PREFIX)) doomed.push(raw);
    }
    for (const k of doomed) window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
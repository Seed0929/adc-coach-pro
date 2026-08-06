// ---------------------------------------------------------------------------
// VersionRepository — patch version tracking + automatic patch detection.
// Facts only: which Riot patch the app's League knowledge is aligned to.
// ---------------------------------------------------------------------------
import {
  DataDragonProvider,
  FALLBACK_PATCH,
  currentPatch,
  detectPatch,
  isDegraded,
  onPatchChange,
  refreshPatch,
} from "./provider";

/** "14.24.1" → "14.24" (the patch label players recognise). */
export function patchLabel(patch = currentPatch()): string {
  const parts = patch.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : patch;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function isNewerPatch(candidate: string, current = currentPatch()): boolean {
  return compareVersions(candidate, current) > 0;
}

/** True when we are serving the last-known-good patch because Riot is down. */
export function isFallbackPatch(): boolean {
  return isDegraded() && currentPatch() === FALLBACK_PATCH;
}

export const VersionRepository = {
  current: currentPatch,
  label: patchLabel,
  fallback: FALLBACK_PATCH,
  detect: detectPatch,
  refresh: refreshPatch,
  onChange: onPatchChange,
  compare: compareVersions,
  isNewer: isNewerPatch,
  isFallback: isFallbackPatch,
  degraded: isDegraded,
  ensureLoaded: DataDragonProvider.load,
} as const;

export type VersionRepositoryFacade = typeof VersionRepository;
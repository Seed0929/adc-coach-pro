import { useEffect, useSyncExternalStore } from "react";
import {
  riotAssets,
  loadRiotAssets,
  subscribeAssets,
  getAssetsSnapshot,
  type RiotAssetService,
} from "@/lib/riot-assets";

/**
 * Access the RiotAssetService and trigger metadata loading. Re-renders once the
 * current Data Dragon patch + champion/spell/rune maps are ready so any
 * champion-name based URLs resolve to their correct Data Dragon ids.
 */
export function useRiotAssets(): { assets: RiotAssetService; ready: boolean; version: string } {
  useEffect(() => {
    void loadRiotAssets();
  }, []);

  useSyncExternalStore(
    subscribeAssets,
    getAssetsSnapshot,
    getAssetsSnapshot, // server snapshot (stable) — avoids hydration mismatch
  );

  return { assets: riotAssets, ready: riotAssets.ready, version: riotAssets.version };
}

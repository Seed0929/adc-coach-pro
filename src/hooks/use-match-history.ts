import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import { getStoredMatches, syncMatches, type StoredMatch } from "@/lib/matches.functions";

interface MatchHistoryState {
  matches: StoredMatch[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastImported: number | null;
  /** Re-import from Riot (idempotent). */
  sync: () => Promise<void>;
  linked: boolean;
}

/**
 * Loads the signed-in user's stored match history and exposes a `sync` action
 * that pulls the latest 20 games from Riot without creating duplicates.
 * Guests / unlinked accounts get an empty list so the UI can fall back to demo.
 */
export function useMatchHistory(): MatchHistoryState {
  const { isAuthenticated, profile } = useAuth();
  const { version } = useSync();
  const fetchStored = useServerFn(getStoredMatches);
  const runSync = useServerFn(syncMatches);

  const [matches, setMatches] = useState<StoredMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImported, setLastImported] = useState<number | null>(null);

  const linked = isAuthenticated && Boolean(profile?.riot_connected);

  const load = useCallback(async () => {
    if (!linked) {
      setMatches([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStored();
      if (result.ok) setMatches(result.matches);
      else setError(result.message);
    } catch {
      setError("Couldn't load your match history right now.");
    } finally {
      setLoading(false);
    }
  }, [linked, fetchStored]);

  const sync = useCallback(async () => {
    if (!linked) return;
    setSyncing(true);
    setError(null);
    try {
      const result = await runSync();
      if (result.ok) {
        setMatches(result.matches);
        setLastImported(result.imported ?? 0);
      } else {
        setError(result.message);
      }
    } catch {
      setError("Couldn't sync your matches right now.");
    } finally {
      setSyncing(false);
    }
  }, [linked, runSync]);

  useEffect(() => {
    void load();
  }, [load, version]);

  return { matches, loading, syncing, error, lastImported, sync, linked };
}

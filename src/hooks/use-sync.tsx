import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { autoSync } from "@/lib/matches.functions";

// ---------------------------------------------------------------------------
// Automatic Riot match synchronization.
//
// - On login / mount: check Riot for the newest completed match and import it.
// - Every 5 minutes while mounted: repeat the lightweight check.
// - When a new match is imported, `version` bumps so data hooks refetch and the
//   dashboard updates live without a page reload.
// - Rate limits + failures never interrupt the session; cached data stays.
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface SyncValue {
  /** True while a sync check is in flight ("Checking Riot..."). */
  checking: boolean;
  /** ISO timestamp of the last successful sync check, or null. */
  lastSyncedAt: string | null;
  /** Increments whenever new match data landed — data hooks watch this. */
  version: number;
  /** Whether a linked Riot account exists (sync only runs when true). */
  linked: boolean;
  /** Manually trigger a sync check. */
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile } = useAuth();
  const runAutoSync = useServerFn(autoSync);
  const linked = isAuthenticated && Boolean(profile?.riot_connected);

  const [checking, setChecking] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    profile?.last_synced_at ?? null,
  );
  const [version, setVersion] = useState(0);
  const inFlight = useRef(false);

  // Seed the timestamp from the profile once it loads.
  useEffect(() => {
    if (profile?.last_synced_at) setLastSyncedAt(profile.last_synced_at);
  }, [profile?.last_synced_at]);

  const syncNow = useCallback(async () => {
    if (!linked || inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const result = await runAutoSync();
      if (result.ok) {
        setLastSyncedAt(result.lastSyncedAt);
        if (result.changed) setVersion((v) => v + 1);
      }
    } catch {
      // Network / rate-limit failure — keep cached data, try again next cycle.
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [linked, runAutoSync]);

  // Run on login / mount, then on a 5-minute cadence.
  useEffect(() => {
    if (!linked) return;
    void syncNow();
    const id = setInterval(() => void syncNow(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [linked, syncNow]);

  return (
    <SyncContext.Provider value={{ checking, lastSyncedAt, version, linked, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    // Safe fallback so components can call useSync outside the provider.
    return {
      checking: false,
      lastSyncedAt: null,
      version: 0,
      linked: false,
      syncNow: async () => {},
    };
  }
  return ctx;
}

/** "Last synced: 3 minutes ago" style relative label. */
export function formatLastSynced(iso: string | null): string {
  if (!iso) return "Not synced yet";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 5) return "Last synced: just now";
  if (sec < 60) return `Last synced: ${sec} seconds ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Last synced: ${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Last synced: ${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.floor(hr / 24);
  return `Last synced: ${d} day${d === 1 ? "" : "s"} ago`;
}

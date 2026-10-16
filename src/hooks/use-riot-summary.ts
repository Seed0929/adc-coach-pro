import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getRiotSummary, type RiotAccountSummary } from "@/lib/riot.functions";

interface RiotSummaryState {
  summary: RiotAccountSummary | null;
  loading: boolean;
  error: string | null;
  /** True when the last rank lookup failed and a previously fetched rank is being shown. */
  rankStale: boolean;
  refresh: (opts?: { fresh?: boolean }) => Promise<void>;
}

/**
 * Fetches the signed-in user's live Riot summary (level, icon, rank) once their
 * account is linked. Returns null while unlinked or for guests — the dashboard
 * falls back to demo data in that case.
 */
export function useRiotSummary(): RiotSummaryState {
  const { isAuthenticated, profile } = useAuth();
  const fetchSummary = useServerFn(getRiotSummary);
  const [summary, setSummary] = useState<RiotAccountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rankStale, setRankStale] = useState(false);

  const linked = isAuthenticated && Boolean(profile?.riot_connected);

  const refresh = useCallback(async (opts?: { fresh?: boolean }) => {
    if (!linked) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSummary({ data: { fresh: Boolean(opts?.fresh) } });
      if (result.ok) {
        const next = result.account;
        setSummary((prev) => {
          // Transient rank failure: keep the last known rank but flag it stale.
          if (next.rankState.status === "unavailable" && prev?.rank) {
            setRankStale(true);
            return { ...next, rank: prev.rank };
          }
          setRankStale(false);
          return next;
        });
      } else setError(result.message);
    } catch {
      setError("Couldn't load your Riot profile right now.");
    } finally {
      setLoading(false);
    }
  }, [linked, fetchSummary]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, rankStale, refresh };
}
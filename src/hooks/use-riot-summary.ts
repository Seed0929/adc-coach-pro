import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getRiotSummary, type RiotAccountSummary } from "@/lib/riot.functions";

interface RiotSummaryState {
  summary: RiotAccountSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
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

  const linked = isAuthenticated && Boolean(profile?.riot_connected);

  const refresh = useCallback(async () => {
    if (!linked) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSummary();
      if (result.ok) setSummary(result.account);
      else setError(result.message);
    } catch {
      setError("Couldn't load your Riot profile right now.");
    } finally {
      setLoading(false);
    }
  }, [linked, fetchSummary]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
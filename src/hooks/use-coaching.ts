import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import { getCoachingAnalysis } from "@/lib/coaching.functions";
import { buildDemoCoaching, type CoachingSummary } from "@/lib/coaching-engine";

/**
 * Provides the coaching summary for the current user.
 *
 * - Linked Riot account → live, deterministic analysis (persisted server-side).
 * - Guests / unlinked / failures → demo analysis flagged `isDemo` so the UI can
 *   render a "Demo Analysis" badge over the same layout.
 */
export function useCoaching(): { summary: CoachingSummary; loading: boolean } {
  const { isAuthenticated, profile } = useAuth();
  const { version } = useSync();
  const fetchCoaching = useServerFn(getCoachingAnalysis);
  const demo = useMemo(() => buildDemoCoaching(), []);
  const [summary, setSummary] = useState<CoachingSummary>(demo);
  const [loading, setLoading] = useState(false);
  const linked = isAuthenticated && Boolean(profile?.riot_connected);

  useEffect(() => {
    let active = true;
    if (!linked) {
      setSummary(demo);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const result = await fetchCoaching();
        if (!active) return;
        setSummary(result.ok ? result.summary : demo);
      } catch {
        if (active) setSummary(demo);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [linked, fetchCoaching, demo, version]);

  return { summary, loading };
}
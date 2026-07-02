import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import { getMatchReport } from "@/lib/coaching.functions";
import { buildDemoMatchReport, type MatchCoachingReport } from "@/lib/coaching-engine";

interface MatchReportState {
  report: MatchCoachingReport | null;
  loading: boolean;
  error: string | null;
  isDemo: boolean;
}

/**
 * Loads the AI Coach report for a single match. Demo match ids (`demo-N`) are
 * built client-side from the pure engine; real match ids fetch from the server.
 */
export function useMatchReport(matchId: string): MatchReportState {
  const { isAuthenticated, profile } = useAuth();
  const { version } = useSync();
  const fetchReport = useServerFn(getMatchReport);
  const [report, setReport] = useState<MatchCoachingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDemoMatch = matchId.startsWith("demo-");
  const linked = Boolean(isAuthenticated && profile?.onboarding_complete && !isDemoMatch);

  useEffect(() => {
    let active = true;

    if (isDemoMatch || !linked) {
      const idx = isDemoMatch ? Number(matchId.slice(5)) || 0 : 0;
      setReport(buildDemoMatchReport(idx));
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const result = await fetchReport({ data: { matchId } });
        if (!active) return;
        if (result.ok) {
          setReport(result.report);
          setError(null);
        } else {
          setReport(null);
          setError(result.message);
        }
      } catch {
        if (active) {
          setReport(null);
          setError("Couldn't load this match's report.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [matchId, linked, isDemoMatch, fetchReport, version]);

  return { report, loading, error, isDemo: isDemoMatch || !linked };
}

import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import { getMatchReport } from "@/lib/coaching.functions";
import { buildDemoMatchReport, type MatchCoachingReport } from "@/lib/coaching-engine";
import { trackBetaEvent, BETA_EVENTS } from "@/lib/analytics/beta-analytics";

interface MatchReportState {
  report: MatchCoachingReport | null;
  loading: boolean;
  error: string | null;
  isDemo: boolean;
  /** Re-request this match's report after a recoverable failure. */
  retry: () => void;
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
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const isDemoMatch = matchId.startsWith("demo-");
  // Gate on `riot_connected` — the same flag every other data hook uses. Keying
  // this on `onboarding_complete` made a profile-only onboarding look "linked"
  // here while history/sync treated it as a guest, so real reports were fetched
  // for an account that had no synced matches.
  const linked = Boolean(isAuthenticated && profile?.riot_connected && !isDemoMatch);

  useEffect(() => {
    let active = true;
    trackBetaEvent(BETA_EVENTS.matchAnalysisOpened, {
      surface: "match-report",
      demo: isDemoMatch || !linked,
    });

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
          trackBetaEvent(BETA_EVENTS.matchReportViewed, {
            surface: "match-report",
            degraded: !result.report.decisionChain,
          });
          if (!result.report.decisionChain) {
            trackBetaEvent(BETA_EVENTS.degradedDataState, {
              surface: "match-report",
              reason: "no_decision_chain",
              degraded: true,
            });
          }
        } else {
          setReport(null);
          setError(result.message);
          trackBetaEvent(
            result.code === "not_found" ? BETA_EVENTS.noMatchState : BETA_EVENTS.recoverableError,
            { surface: "match-report", reason: result.code },
          );
        }
      } catch {
        if (active) {
          setReport(null);
          setError("Couldn't load this match's report.");
          trackBetaEvent(BETA_EVENTS.recoverableError, {
            surface: "match-report",
            reason: "unreachable",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [matchId, linked, isDemoMatch, fetchReport, version, attempt]);

  return { report, loading, error, isDemo: isDemoMatch || !linked, retry };
}

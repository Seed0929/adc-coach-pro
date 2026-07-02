import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import { getCoachDossier, buildDemoDossier } from "@/lib/coaching.functions";
import type { CoachDossier } from "@/lib/player-memory";

/**
 * Provides the persistent coaching dossier for the current player.
 *
 * - Linked Riot account → live dossier built from cached match analyses.
 * - Guests / unlinked / failures → demo dossier flagged `isDemo`.
 */
export function useCoachDossier(): { dossier: CoachDossier; loading: boolean } {
  const { isAuthenticated, profile } = useAuth();
  const { version } = useSync();
  const fetchDossier = useServerFn(getCoachDossier);
  const demo = useMemo(() => buildDemoDossier(), []);
  const [dossier, setDossier] = useState<CoachDossier>(demo);
  const [loading, setLoading] = useState(false);
  const linked = isAuthenticated && Boolean(profile?.riot_connected);

  useEffect(() => {
    let active = true;
    if (!linked) {
      setDossier(demo);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const result = await fetchDossier();
        if (!active) return;
        setDossier(result.ok ? result.dossier : demo);
      } catch {
        if (active) setDossier(demo);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [linked, fetchDossier, demo, version]);

  return { dossier, loading };
}

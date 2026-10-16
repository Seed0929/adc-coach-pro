import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import {
  getCoachDossier,
  buildDemoDossier,
  type CoachChampionOption,
  type CoachScope,
} from "@/lib/coaching.functions";
import type { CoachDossier } from "@/lib/player-memory";

/**
 * Provides the persistent coaching dossier for the current player.
 *
 * - Linked Riot account → live dossier built from cached match analyses.
 * - Guests / unlinked / failures → demo dossier flagged `isDemo`.
 */
export interface CoachDossierState {
  dossier: CoachDossier;
  loading: boolean;
  /** Champions from the player's stored Riot matches; empty for demo/guests. */
  champions: CoachChampionOption[];
  scope: CoachScope | null;
}

export function useCoachDossier(champion: string | null = null): CoachDossierState {
  const { isAuthenticated, profile } = useAuth();
  const { version } = useSync();
  const fetchDossier = useServerFn(getCoachDossier);
  const demo = useMemo(() => buildDemoDossier(), []);
  const [dossier, setDossier] = useState<CoachDossier>(demo);
  const [loading, setLoading] = useState(false);
  const [champions, setChampions] = useState<CoachChampionOption[]>([]);
  const [scope, setScope] = useState<CoachScope | null>(null);
  const linked = isAuthenticated && Boolean(profile?.riot_connected);

  useEffect(() => {
    let active = true;
    if (!linked) {
      setDossier(demo);
      setChampions([]);
      setScope(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const result = await fetchDossier({ data: { champion } });
        if (!active) return;
        setDossier(result.ok ? result.dossier : demo);
        setChampions(result.ok ? result.champions : []);
        setScope(result.ok ? result.scope : null);
      } catch {
        if (active) {
          setDossier(demo);
          setScope(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [linked, fetchDossier, demo, version, champion]);

  return { dossier, loading, champions, scope };
}

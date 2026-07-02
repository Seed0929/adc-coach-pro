import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import { getPlayerProfile } from "@/lib/profile.functions";
import { buildDemoPlayerProfile, type PlayerProfile } from "@/lib/profile-engine";

/**
 * Provides the long-term player profile.
 *
 * - Linked Riot account → live profile assembled from cached analyses + rank.
 * - Guests / unlinked / failures → demo profile flagged `isDemo`.
 */
export function usePlayerProfile(): { profile: PlayerProfile; loading: boolean } {
  const { isAuthenticated, profile: authProfile } = useAuth();
  const { version } = useSync();
  const fetchProfile = useServerFn(getPlayerProfile);
  const demo = useMemo(() => buildDemoPlayerProfile(), []);
  const [profile, setProfile] = useState<PlayerProfile>(demo);
  const [loading, setLoading] = useState(false);
  const linked = isAuthenticated && Boolean(authProfile?.riot_connected);

  useEffect(() => {
    let active = true;
    if (!linked) {
      setProfile(demo);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const result = await fetchProfile();
        if (!active) return;
        setProfile(result.ok && result.profile.matches.length > 0 ? result.profile : demo);
      } catch {
        if (active) setProfile(demo);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [linked, fetchProfile, demo, version]);

  return { profile, loading };
}
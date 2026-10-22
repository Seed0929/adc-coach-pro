import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Tables } from "@/integrations/supabase/types";
import { readMfaStatus, MFA_STATUS_UNKNOWN, type MfaStatus } from "@/lib/security/mfa";

export type Profile = Tables<"profiles">;

export function hasCompletedOnboarding(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.onboarding_complete);
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Provider-derived MFA state for the current session. */
  mfa: MfaStatus;
  /** True while the provider says this session still owes an MFA challenge. */
  mfaChallengeRequired: boolean;
  refreshMfa: () => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    username: string;
  }) => Promise<{ error: string | null }>;
  signIn: (params: { email: string; password: string }) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Ensures a profile row exists for the signed-in user (RLS-scoped upsert). */
async function ensureProfile(user: User): Promise<Profile | null> {
  const username =
    (user.user_metadata?.username as string | undefined) ??
    user.email?.split("@")[0] ??
    "player";

  // Create the profile row on first sign-in if it doesn't exist yet.
  await supabase
    .from("profiles")
    .upsert(
      { id: user.id, email: user.email ?? null, username },
      { onConflict: "id", ignoreDuplicates: true },
    );

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfa, setMfa] = useState<MfaStatus>(MFA_STATUS_UNKNOWN);
  const userIdRef = useRef<string | null>(null);
  const revision = useRef(0);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) { setProfile(null); return null; }
    const p = await ensureProfile(nextUser);
    if (userIdRef.current === nextUser.id) setProfile(p);
    return p;
  }, []);

  const refreshMfa = useCallback(async () => {
    const id = userIdRef.current;
    const version = revision.current;
    if (!id) return;
    let next = MFA_STATUS_UNKNOWN;
    try { next = await readMfaStatus(); } catch { /* Unknown stays blocked, with a retry. */ }
    if (id !== userIdRef.current || version !== revision.current) return;
    setMfa(next);
    if (next.known && !next.challengeRequired) {
      const { data } = await supabase.auth.getUser();
      if (data.user && data.user.id === id) await loadProfile(data.user);
      if (id === userIdRef.current) await queryClient.invalidateQueries();
    }
  }, [loadProfile, queryClient]);

  useEffect(() => {
    let active = true;
    async function applySession(nextSession: Session | null, version: number) {
      if (!active || version !== revision.current) return;
      if (!nextSession) { setLoading(false); return; }
      // Revalidate identity, then resolve native MFA BEFORE reading protected profile rows.
      const { data, error } = await supabase.auth.getUser();
      if (!active || version !== revision.current) return;
      if (error || !data.user) {
        setMfa(MFA_STATUS_UNKNOWN);
        setLoading(false);
        return;
      }
      await refreshMfa();
      if (active && version === revision.current) setLoading(false);
    }
    function receiveSession(nextSession: Session | null) {
      if (!active) return;
      const previousId = userIdRef.current;
      const id = nextSession?.user.id ?? null;
      const version = ++revision.current;
      userIdRef.current = id;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setMfa(MFA_STATUS_UNKNOWN);
      setLoading(Boolean(nextSession));
      setProfile(null);
      if (previousId !== id || !id) queryClient.clear();
      // Never call provider methods inside onAuthStateChange (SDK lock/deadlock).
      setTimeout(() => { void applySession(nextSession, version).catch(() => {
        if (active && version === revision.current) { setMfa(MFA_STATUS_UNKNOWN); setLoading(false); }
      }); }, 0);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "TOKEN_REFRESHED", "MFA_CHALLENGE_VERIFIED", "PASSWORD_RECOVERY"].includes(event)) {
        receiveSession(nextSession);
      }
    });
    // Listener is installed first; do not overwrite a newer sign-in/out event.
    const initialRevision = revision.current;
    supabase.auth.getSession().then(({ data }) => {
      if (active && revision.current === initialRevision) receiveSession(data.session);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [refreshMfa, queryClient]);

  const signUp = useCallback<AuthContextValue["signUp"]>(async ({ email, password, username }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: oauthReturnUrl(),
        data: { username },
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback<AuthContextValue["signIn"]>(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback<AuthContextValue["signInWithGoogle"]>(async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: oauthReturnUrl(),
    });
    if (result.error) return { error: result.error.message ?? "Google sign-in failed" };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error("Couldn’t sign out. Please try again.");
    ++revision.current;
    userIdRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);

    setMfa(MFA_STATUS_UNKNOWN);
    setLoading(false);
  }, [queryClient]);

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      isAuthenticated: !!session,
      mfa,
      mfaChallengeRequired: !!session && (!mfa.known || mfa.challengeRequired),
      refreshMfa,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      mfa,
      refreshMfa,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
/** Same-origin path of a pending agent-connection consent, if any. */
export function consentReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const r = new URLSearchParams(window.location.search).get("redirect");
  return r && r.startsWith("/.lovable/oauth/consent") && !r.startsWith("//") ? r : null;
}

function oauthReturnUrl(): string {
  return window.location.origin + (consentReturnPath() ?? "");
}

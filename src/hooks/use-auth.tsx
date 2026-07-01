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
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export function hasCompletedOnboarding(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.onboarding_complete || profile?.onboarding_completed);
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return null;
    }
    const p = await ensureProfile(nextUser);
    setProfile(p);
    return p;
  }, []);

  useEffect(() => {
    let active = true;

    async function applySession(nextSession: Session | null) {
      if (!active) return;
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser) {
        userIdRef.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      userIdRef.current = nextUser.id;
      await loadProfile(nextUser);
      if (active) setLoading(false);
    }

    // Register the listener first, then hydrate the existing session. Profile
    // reads are intentionally deferred outside the auth callback to avoid
    // blocking auth events while still keeping routing gated until ready.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser) {
        userIdRef.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      if (userIdRef.current === nextUser.id && profile) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setTimeout(() => {
        void applySession(nextSession);
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        void applySession(data.session);
      } else {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, profile]);

  const signUp = useCallback<AuthContextValue["signUp"]>(async ({ email, password, username }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
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
      redirect_uri: window.location.origin,
    });
    if (result.error) return { error: result.error.message ?? "Google sign-in failed" };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

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
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [session, user, profile, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
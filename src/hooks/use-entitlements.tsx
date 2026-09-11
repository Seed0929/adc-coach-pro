import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getEntitlements, setDevPlan } from "@/lib/entitlements/entitlements.functions";
import {
  guestEntitlementState,
  type BillingPlan,
  type Capability,
  type EntitlementState,
} from "@/lib/entitlements/plan";

interface EntitlementContextValue {
  state: EntitlementState;
  loading: boolean;
  /** Signed-in with a resolved plan (guests browse on the Free experience). */
  resolved: boolean;
  can: (capability: Capability) => boolean;
  isPro: boolean;
  refresh: () => Promise<void>;
  switchPlan: (plan: BillingPlan) => Promise<string | null>;
}

const EntitlementContext = createContext<EntitlementContextValue | undefined>(undefined);

/**
 * Single client-side source of truth for plan access. Every surface reads
 * capabilities from here instead of testing the plan string itself.
 */
export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const fetchState = useServerFn(getEntitlements);
  const changePlan = useServerFn(setDevPlan);
  const guest = useMemo(() => guestEntitlementState(), []);
  const [state, setState] = useState<EntitlementState>(guest);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setState(guest);
      setResolved(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchState();
      if (result.ok) {
        setState(result.state);
        setResolved(true);
      }
    } catch {
      /* keep the Free experience on failure — never unlock on an error */
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchState, guest]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchPlan = useCallback<EntitlementContextValue["switchPlan"]>(
    async (plan) => {
      try {
        const result = await changePlan({ data: { plan } });
        if (!result.ok) return result.message;
        setState(result.state);
        setResolved(true);
        return null;
      } catch {
        return "Couldn't change the plan right now.";
      }
    },
    [changePlan],
  );

  const value = useMemo<EntitlementContextValue>(
    () => ({
      state,
      loading,
      resolved,
      can: (capability) => state.capabilities[capability],
      isPro: state.plan === "pro",
      refresh,
      switchPlan,
    }),
    [state, loading, resolved, refresh, switchPlan],
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error("useEntitlements must be used within an EntitlementProvider");
  return ctx;
}

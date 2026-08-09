// ---------------------------------------------------------------------------
// Automatic report context (Sprint 5.8) — browser side.
//
// Collects only low-risk diagnostics the user shouldn't have to type. No
// tokens, keys, storage contents or MFA material is ever read here; the server
// additionally allow-lists these keys before persisting them.
// ---------------------------------------------------------------------------

export interface ClientDiagnostics {
  route?: string;
  feature?: string;
  appVersion?: string;
  buildMode?: string;
  userAgent?: string;
  language?: string;
  platform?: string;
  viewport?: string;
  timezone?: string;
  submittedAt?: string;
}

export function collectClientDiagnostics(input: {
  route: string;
  feature?: string;
}): ClientDiagnostics {
  const base: ClientDiagnostics = {
    route: input.route,
    feature: input.feature,
    buildMode: import.meta.env.MODE,
    submittedAt: new Date().toISOString(),
  };
  if (typeof navigator === "undefined" || typeof window === "undefined") return base;
  return {
    ...base,
    userAgent: navigator.userAgent.slice(0, 300),
    language: navigator.language,
    platform: (navigator as Navigator & { platform?: string }).platform,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
// ---------------------------------------------------------------------------
// Sprint 5.4 — Private-beta journey tracker.
//
// Guarantees (all covered by hardening checks):
//   1. `trackBetaEvent` NEVER throws and never returns a rejected promise.
//   2. A failing / missing transport is invisible to the product.
//   3. Only whitelisted, sanitized detail keys are persisted.
//   4. Once-per-session events (journey milestones) are de-duplicated.
//   5. Nothing in the coaching pipeline depends on this module.
// ---------------------------------------------------------------------------
import {
  ALLOWED_DETAIL_KEYS,
  BETA_EVENTS,
  STAGE_BY_EVENT,
  type BetaEventDetail,
  type BetaEventName,
  type BetaEventRecord,
  type BetaEventTransport,
} from "./beta-events";

const SESSION_KEY = "botdiff.beta.session";

/** Journey milestones that should be counted at most once per browser session. */
const ONCE_PER_SESSION: ReadonlySet<BetaEventName> = new Set([
  BETA_EVENTS.loginJourneyReached,
  BETA_EVENTS.riotConnectionStarted,
  BETA_EVENTS.riotConnectionCompleted,
  BETA_EVENTS.firstSyncStarted,
  BETA_EVENTS.firstSyncCompleted,
  BETA_EVENTS.coachingJourneyCompleted,
]);

let transport: BetaEventTransport | null = null;
let sessionId: string | null = null;
const seen = new Set<string>();

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Anonymous, per-browser-session id. Not a user identifier. */
export function betaSessionId(): string {
  if (sessionId) return sessionId;
  try {
    if (typeof sessionStorage !== "undefined") {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) {
        sessionId = existing;
        return sessionId;
      }
      const fresh = randomId();
      sessionStorage.setItem(SESSION_KEY, fresh);
      sessionId = fresh;
      return sessionId;
    }
  } catch {
    /* storage blocked — fall back to memory */
  }
  sessionId = randomId();
  return sessionId;
}

/** Install the persistence transport. Called once at app start. */
export function configureBetaAnalytics(next: BetaEventTransport | null): void {
  transport = next;
}

/** Test helper: forget de-duplication + session state. */
export function resetBetaAnalytics(): void {
  seen.clear();
  sessionId = null;
  transport = null;
}

/** Drop unknown keys, clamp numbers, truncate strings. */
export function sanitizeDetail(detail: BetaEventDetail | undefined): BetaEventDetail {
  const out: BetaEventDetail = {};
  if (!detail || typeof detail !== "object") return out;
  for (const key of ALLOWED_DETAIL_KEYS) {
    const value = (detail as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    if (key === "count") {
      const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
      if (n !== null) out.count = Math.max(0, Math.min(10_000, n));
    } else if (key === "demo" || key === "degraded") {
      out[key] = Boolean(value);
    } else if (typeof value === "string") {
      const s = value.trim().slice(0, 64);
      if (s) out[key] = s;
    }
  }
  return out;
}

/**
 * Record one beta journey event. Fire-and-forget: callers never await it and
 * failures are swallowed on purpose — coaching must work with analytics down.
 */
export function trackBetaEvent(name: BetaEventName, detail?: BetaEventDetail): void {
  try {
    const record: BetaEventRecord = {
      name,
      stage: STAGE_BY_EVENT[name] ?? "health",
      sessionId: betaSessionId(),
      detail: sanitizeDetail(detail),
      at: new Date().toISOString(),
    };

    if (ONCE_PER_SESSION.has(name)) {
      if (seen.has(name)) return;
      seen.add(name);
    }

    if (!transport) return;
    const result = transport(record);
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // Analytics can never surface an error to the player.
  }
}

export { BETA_EVENTS };
export type { BetaEventDetail, BetaEventName, BetaEventRecord };
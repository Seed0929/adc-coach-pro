// ---------------------------------------------------------------------------
// AI Provider abstraction (client-safe types).
//
// OpenAI is never hardcoded into the app. Any provider implements this
// interface. When no provider is available (no API key), coaching gracefully
// falls back to the deterministic engine — nothing throws, the whole
// architecture stays operational.
// ---------------------------------------------------------------------------
import type { CoachingContext } from "./context-builder";

export interface CoachAIProvider {
  readonly name: string;
  /** False when the provider can't run (e.g. missing API key). */
  readonly available: boolean;
  /**
   * Generate a coaching answer from the master prompt + context + question.
   * Returns null on any failure so callers can fall back deterministically.
   */
  generate(context: CoachingContext): Promise<string | null>;
}

/** The no-op provider used whenever no real provider is configured. */
export const unavailableProvider: CoachAIProvider = {
  name: "none",
  available: false,
  async generate() {
    return null;
  },
};
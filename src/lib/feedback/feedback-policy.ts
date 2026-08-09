// ---------------------------------------------------------------------------
// Feedback / Bug Report policy (Sprint 5.8) — PURE rules, no I/O.
//
// Everything here is deterministic so the validation suite can assert the
// security and validation rules without a database or a browser: allowed
// report types, required-field validation, diagnostic allow-listing (secret
// material can never be smuggled into a report) and duplicate detection.
// ---------------------------------------------------------------------------

export const REPORT_TYPES = [
  "bug",
  "coaching_feedback",
  "incorrect_data",
  "ui_issue",
  "feature_request",
  "other",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ["new", "reviewing", "resolved", "closed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Client-safe shape of a stored report (no internal diagnostics). */
export interface StoredReport {
  id: string;
  reportType: string;
  title: string;
  status: ReportStatus;
  matchId: string | null;
  createdAt: string;
}

/** Player-friendly labels — no technical jargon in the UI. */
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  bug: "Something is broken",
  coaching_feedback: "The coaching was off",
  incorrect_data: "My match data looks wrong",
  ui_issue: "Something looks or feels wrong",
  feature_request: "I have an idea",
  other: "Something else",
};

/** Structured coaching-feedback verdicts (Sprint 5.8 §10). Review-only. */
export const COACHING_VERDICTS = [
  "coaching_wrong",
  "advice_unclear",
  "evidence_mismatch",
  "actually_good_decision",
  "not_my_biggest_issue",
] as const;
export type CoachingVerdict = (typeof COACHING_VERDICTS)[number];

export const COACHING_VERDICT_LABELS: Record<CoachingVerdict, string> = {
  coaching_wrong: "This coaching was wrong",
  advice_unclear: "This advice doesn't make sense",
  evidence_mismatch: "The evidence doesn't match what happened",
  actually_good_decision: "This was actually a good decision",
  not_my_biggest_issue: "The detected mistake is not my biggest issue",
};

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 4000;
/** Two identical reports inside this window are treated as a double-submit. */
export const DUPLICATE_WINDOW_MS = 60_000;

export function isReportType(value: unknown): value is ReportType {
  return typeof value === "string" && (REPORT_TYPES as readonly string[]).includes(value);
}

export function isCoachingVerdict(value: unknown): value is CoachingVerdict {
  return typeof value === "string" && (COACHING_VERDICTS as readonly string[]).includes(value);
}

export interface ReportDraft {
  reportType: unknown;
  title: unknown;
  description: unknown;
  route?: unknown;
  feature?: unknown;
  matchId?: unknown;
  coachingVerdict?: unknown;
  diagnostics?: unknown;
}

export interface ValidReport {
  reportType: ReportType;
  title: string;
  description: string;
  route: string | null;
  feature: string | null;
  matchId: string | null;
  coachingVerdict: CoachingVerdict | null;
  diagnostics: Record<string, string | number | boolean>;
}

export type ValidationResult =
  | { ok: true; value: ValidReport }
  | { ok: false; field: string; message: string };

const MATCH_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown, max: number): string | null {
  const t = text(value);
  return t ? t.slice(0, max) : null;
}

/**
 * Diagnostics allow-list. Anything not named here is dropped, so a tampered
 * client cannot persist tokens, keys or MFA material through this endpoint.
 */
export const ALLOWED_DIAGNOSTIC_KEYS = [
  "route",
  "feature",
  "appVersion",
  "buildMode",
  "userAgent",
  "language",
  "platform",
  "viewport",
  "timezone",
  "isDemo",
  "submittedAt",
] as const;

const FORBIDDEN_VALUE_RE =
  /(password|bearer\s|api[_-]?key|secret|access[_-]?token|refresh[_-]?token|otpauth|sb-[a-z0-9]+-auth-token)/i;

export function sanitizeDiagnostics(input: unknown): Record<string, string | number | boolean> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const out: Record<string, string | number | boolean> = {};
  for (const key of ALLOWED_DIAGNOSTIC_KEYS) {
    const value = source[key];
    if (value == null) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, 300);
    if (!trimmed || FORBIDDEN_VALUE_RE.test(trimmed)) continue;
    out[key] = trimmed;
  }
  return out;
}

export function validateReport(draft: ReportDraft): ValidationResult {
  if (!isReportType(draft.reportType)) {
    return { ok: false, field: "reportType", message: "Pick what kind of report this is." };
  }
  const title = text(draft.title);
  if (title.length < 4) {
    return { ok: false, field: "title", message: "Add a short summary (at least 4 characters)." };
  }
  const description = text(draft.description);
  if (description.length < 10) {
    return {
      ok: false,
      field: "description",
      message: "Tell us a little more so we can reproduce it (at least 10 characters).",
    };
  }

  const matchIdRaw = optionalText(draft.matchId, 64);
  if (matchIdRaw && !MATCH_ID_RE.test(matchIdRaw)) {
    return { ok: false, field: "matchId", message: "That match reference isn't valid." };
  }

  if (draft.coachingVerdict != null && text(draft.coachingVerdict) !== "" && !isCoachingVerdict(draft.coachingVerdict)) {
    return { ok: false, field: "coachingVerdict", message: "That coaching option isn't valid." };
  }

  return {
    ok: true,
    value: {
      reportType: draft.reportType,
      title: title.slice(0, TITLE_MAX),
      description: description.slice(0, DESCRIPTION_MAX),
      route: optionalText(draft.route, 200),
      feature: optionalText(draft.feature, 80),
      matchId: matchIdRaw,
      coachingVerdict: isCoachingVerdict(draft.coachingVerdict) ? draft.coachingVerdict : null,
      diagnostics: sanitizeDiagnostics(draft.diagnostics),
    },
  };
}

/** True when an identical report from the same user landed moments ago. */
export function isDuplicateSubmission(
  candidate: Pick<ValidReport, "reportType" | "title" | "description">,
  recent: { report_type: string; title: string; description: string; created_at: string }[],
  now: number = Date.now(),
): boolean {
  return recent.some(
    (r) =>
      r.report_type === candidate.reportType &&
      r.title.trim() === candidate.title &&
      r.description.trim() === candidate.description &&
      now - new Date(r.created_at).getTime() < DUPLICATE_WINDOW_MS,
  );
}
// ---------------------------------------------------------------------------
// Feedback / Bug Report persistence (Sprint 5.8) — server-only.
//
// Every write goes through the caller's RLS-scoped client, so the row's owner
// is the verified token subject. Match association is verified against rows the
// caller actually owns; a caller can never attach someone else's match.
// ---------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  isDuplicateSubmission,
  type ReportStatus,
  type ValidReport,
} from "./feedback-policy";

type Client = SupabaseClient<Database>;

export interface StoredReport {
  id: string;
  reportType: string;
  title: string;
  status: ReportStatus;
  matchId: string | null;
  createdAt: string;
}

export class FeedbackError extends Error {
  constructor(
    readonly code: "invalid_match" | "duplicate" | "write_failed" | "read_failed",
    message: string,
  ) {
    super(message);
  }
}

/** Demo/sample match ids are public fixtures, never another user's data. */
export function isSampleMatchId(matchId: string): boolean {
  return matchId.startsWith("demo-");
}

/** Confirms the caller owns the match they're reporting about. */
export async function resolveMatchId(
  supabase: Client,
  userId: string,
  matchId: string | null,
): Promise<string | null> {
  if (!matchId) return null;
  if (isSampleMatchId(matchId)) return matchId;
  const { data, error } = await supabase
    .from("matches")
    .select("match_id")
    .eq("profile_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw new FeedbackError("read_failed", "Couldn't verify that match right now.");
  if (!data) {
    throw new FeedbackError("invalid_match", "That match isn't on your account.");
  }
  return data.match_id;
}

export async function createReport(
  supabase: Client,
  userId: string,
  report: ValidReport,
): Promise<StoredReport> {
  const matchId = await resolveMatchId(supabase, userId, report.matchId);

  const { data: recent, error: recentError } = await supabase
    .from("feedback_reports")
    .select("report_type, title, description, created_at")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (recentError) throw new FeedbackError("read_failed", "Couldn't reach the report service.");
  if (isDuplicateSubmission(report, recent ?? [])) {
    throw new FeedbackError("duplicate", "You just sent this report — we already have it.");
  }

  const { data, error } = await supabase
    .from("feedback_reports")
    .insert({
      profile_id: userId,
      report_type: report.reportType,
      title: report.title,
      description: report.description,
      route: report.route,
      feature: report.feature,
      match_id: matchId,
      coaching_verdict: report.coachingVerdict,
      diagnostics: report.diagnostics,
    })
    .select("id, report_type, title, status, match_id, created_at")
    .single();

  if (error || !data) {
    // Never report success on a failed write — the caller keeps their text.
    throw new FeedbackError("write_failed", "We couldn't save your report. Please try again.");
  }

  return {
    id: data.id,
    reportType: data.report_type,
    title: data.title,
    status: data.status as ReportStatus,
    matchId: data.match_id,
    createdAt: data.created_at,
  };
}

/** The caller's own reports. Internal diagnostics are intentionally omitted. */
export async function listReports(supabase: Client, userId: string): Promise<StoredReport[]> {
  const { data, error } = await supabase
    .from("feedback_reports")
    .select("id, report_type, title, status, match_id, created_at")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw new FeedbackError("read_failed", "Couldn't load your reports right now.");
  return (data ?? []).map((row) => ({
    id: row.id,
    reportType: row.report_type,
    title: row.title,
    status: row.status as ReportStatus,
    matchId: row.match_id,
    createdAt: row.created_at,
  }));
}
// ---------------------------------------------------------------------------
// Feedback triage — SERVER-ONLY (Sprint 5.10).
//
// Reports stay append-only for normal users. Triage is a role-gated
// capability: the caller's admin role is resolved through the caller's own
// RLS-scoped client (public.has_role), never from client input, and the read/
// write themselves also run through that client so the admin RLS policies are
// the real enforcement point. No service-role key is involved.
// ---------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { REPORT_STATUSES, type ReportStatus } from "./feedback-policy";
import { FeedbackError } from "./feedback.server";

type Client = SupabaseClient<Database>;

export interface TriageReport {
  id: string;
  reportType: string;
  title: string;
  status: ReportStatus;
  matchId: string | null;
  route: string | null;
  feature: string | null;
  createdAt: string;
}

export class NotAdminError extends Error {
  constructor() {
    super("Forbidden");
  }
}

/** Server-side admin check. Fails closed on any error. */
export async function assertAdmin(supabase: Client, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || data !== true) throw new NotAdminError();
}

export function isValidStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && (REPORT_STATUSES as readonly string[]).includes(value);
}

/** All reports, newest first. Diagnostics are intentionally not returned. */
export async function listAllReports(supabase: Client, userId: string): Promise<TriageReport[]> {
  await assertAdmin(supabase, userId);
  const { data, error } = await supabase
    .from("feedback_reports")
    .select("id, report_type, title, status, match_id, route, feature, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new FeedbackError("read_failed", "Couldn't load reports right now.");
  return (data ?? []).map((row) => ({
    id: row.id,
    reportType: row.report_type,
    title: row.title,
    status: row.status as ReportStatus,
    matchId: row.match_id,
    route: row.route,
    feature: row.feature,
    createdAt: row.created_at,
  }));
}

/** Moves a report through the review states. Status is the only mutable field. */
export async function setReportStatus(
  supabase: Client,
  userId: string,
  reportId: string,
  status: ReportStatus,
): Promise<TriageReport> {
  await assertAdmin(supabase, userId);
  if (!isValidStatus(status)) throw new FeedbackError("write_failed", "Unknown report status.");
  const { data, error } = await supabase
    .from("feedback_reports")
    .update({ status })
    .eq("id", reportId)
    .select("id, report_type, title, status, match_id, route, feature, created_at")
    .maybeSingle();
  if (error || !data) throw new FeedbackError("write_failed", "Couldn't update that report.");
  return {
    id: data.id,
    reportType: data.report_type,
    title: data.title,
    status: data.status as ReportStatus,
    matchId: data.match_id,
    route: data.route,
    feature: data.feature,
    createdAt: data.created_at,
  };
}
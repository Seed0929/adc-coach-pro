// ---------------------------------------------------------------------------
// Feedback / Bug Report server functions (Sprint 5.8).
//
// Authorization is server-side only: the assurance-aware middleware verifies
// the bearer token, and the owner of every report is the token subject — the
// client never supplies a user id.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireVerifiedSession } from "@/lib/security/require-verified-session";
import { validateReport, type ReportDraft } from "./feedback-policy";
import type { StoredReport } from "./feedback-policy";

export type SubmitReportResult =
  | { ok: true; report: StoredReport }
  | { ok: false; code: string; message: string; field?: string };

export type ListReportsResult =
  | { ok: true; reports: StoredReport[] }
  | { ok: false; code: string; message: string };

export type TriageListResult =
  | { ok: true; reports: import("./feedback-triage.server").TriageReport[] }
  | { ok: false; code: string; message: string };

export type TriageUpdateResult =
  | { ok: true; report: import("./feedback-triage.server").TriageReport }
  | { ok: false; code: string; message: string };

export const submitFeedbackReport = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((data: ReportDraft) => data)
  .handler(async ({ data, context }): Promise<SubmitReportResult> => {
    const validated = validateReport(data);
    if (!validated.ok) {
      return { ok: false, code: "invalid", message: validated.message, field: validated.field };
    }
    const { createReport, FeedbackError } = await import("./feedback.server");
    try {
      const report = await createReport(context.supabase, context.userId, validated.value);
      return { ok: true, report };
    } catch (err) {
      if (err instanceof FeedbackError) return { ok: false, code: err.code, message: err.message };
      return { ok: false, code: "unknown", message: "We couldn't save your report. Please try again." };
    }
  });

export const listMyFeedbackReports = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSession])
  .handler(async ({ context }): Promise<ListReportsResult> => {
    const { listReports, FeedbackError } = await import("./feedback.server");
    try {
      return { ok: true, reports: await listReports(context.supabase, context.userId) };
    } catch (err) {
      if (err instanceof FeedbackError) return { ok: false, code: err.code, message: err.message };
      return { ok: false, code: "unknown", message: "Couldn't load your reports right now." };
    }
  });

// --- Admin triage (role-gated server-side; no UI surface yet) --------------

export const listAllFeedbackReports = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSession])
  .handler(async ({ context }): Promise<TriageListResult> => {
    const { listAllReports, NotAdminError } = await import("./feedback-triage.server");
    const { FeedbackError } = await import("./feedback.server");
    try {
      return { ok: true, reports: await listAllReports(context.supabase, context.userId) };
    } catch (err) {
      if (err instanceof NotAdminError) {
        return { ok: false, code: "forbidden", message: "You don't have access to report triage." };
      }
      if (err instanceof FeedbackError) return { ok: false, code: err.code, message: err.message };
      return { ok: false, code: "unknown", message: "Couldn't load reports right now." };
    }
  });

export const setFeedbackReportStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { reportId: string; status: string }) => data)
  .middleware([requireVerifiedSession])
  .handler(async ({ data, context }): Promise<TriageUpdateResult> => {
    const { setReportStatus, isValidStatus, NotAdminError } = await import(
      "./feedback-triage.server"
    );
    const { FeedbackError } = await import("./feedback.server");
    if (!data?.reportId || !isValidStatus(data.status)) {
      return { ok: false, code: "invalid", message: "Unknown report or status." };
    }
    try {
      const report = await setReportStatus(
        context.supabase,
        context.userId,
        data.reportId,
        data.status,
      );
      return { ok: true, report };
    } catch (err) {
      if (err instanceof NotAdminError) {
        return { ok: false, code: "forbidden", message: "You don't have access to report triage." };
      }
      if (err instanceof FeedbackError) return { ok: false, code: err.code, message: err.message };
      return { ok: false, code: "unknown", message: "Couldn't update that report." };
    }
  });
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
import type { StoredReport } from "./feedback.server";

export type SubmitReportResult =
  | { ok: true; report: StoredReport }
  | { ok: false; code: string; message: string; field?: string };

export type ListReportsResult =
  | { ok: true; reports: StoredReport[] }
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
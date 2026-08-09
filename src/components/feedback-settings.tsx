// ---------------------------------------------------------------------------
// Settings entry point for the Bug Report / Feedback system (Sprint 5.8).
// Reuses the existing settings row styling; no redesign.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { listMyFeedbackReports } from "@/lib/feedback/feedback.functions";
import type { StoredReport } from "@/lib/feedback/feedback.server";
import {
  REPORT_TYPE_LABELS,
  type ReportType,
} from "@/lib/feedback/feedback-policy";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  resolved: "Resolved",
  closed: "Closed",
};

export function FeedbackSettings() {
  const { isAuthenticated } = useAuth();
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setReports([]);
      return;
    }
    setLoading(true);
    try {
      const result = await listMyFeedbackReports();
      setReports(result.ok ? result.reports : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="rounded-2xl bg-white/[0.03] p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          <LifeBuoy className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">Report a problem or send feedback</div>
          <div className="truncate text-sm text-muted-foreground">
            Bugs, wrong coaching, odd match data, ideas — it all comes straight to us.
          </div>
        </div>
        <FeedbackDialog
          feature="settings"
          trigger={
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/[0.06]"
            >
              New Report
            </button>
          }
        />
      </div>

      {isAuthenticated && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            My reports {loading && <Loader2 className="size-3 animate-spin" />}
          </div>
          {!loading && reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {REPORT_TYPE_LABELS[r.reportType as ReportType] ?? r.reportType}
                </span>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-xs">
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
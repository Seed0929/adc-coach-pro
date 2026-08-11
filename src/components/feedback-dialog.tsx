// ---------------------------------------------------------------------------
// Bug Report / Feedback form (Sprint 5.8). Minimum functional UI built from the
// existing design system — no redesign, no new visual language.
// ---------------------------------------------------------------------------
import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { collectClientDiagnostics } from "@/lib/feedback/client-context";
import { submitFeedbackReport } from "@/lib/feedback/feedback.functions";
import {
  COACHING_VERDICTS,
  COACHING_VERDICT_LABELS,
  DESCRIPTION_MAX,
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  type CoachingVerdict,
  type ReportType,
} from "@/lib/feedback/feedback-policy";

// Sprint 5.9: the native <select> popup was painted by the OS, so options were
// unreadable until hovered. These selectors now use the project's styled Select
// primitive, which renders its own menu with themed contrast, hover, selected
// and keyboard-focus states.
const TRIGGER_CLASS =
  "h-10 w-full rounded-xl border-white/10 bg-white/[0.04] px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/60";
const CONTENT_CLASS = "border-white/10 bg-popover text-popover-foreground";
const ITEM_CLASS =
  "cursor-pointer text-sm text-popover-foreground focus:bg-primary/20 focus:text-foreground data-[state=checked]:bg-primary/15 data-[state=checked]:font-medium";

/** One field only: the summary stored server-side is derived from the text. */
function deriveTitle(description: string): string {
  const firstLine = description.trim().split(/\r?\n/)[0]?.trim() ?? "";
  const base = firstLine || description.trim();
  return base.length > 120 ? `${base.slice(0, 117).trimEnd()}…` : base;
}

export function FeedbackDialog({
  trigger,
  matchId,
  feature,
  defaultType = "bug",
}: {
  trigger: ReactNode;
  matchId?: string;
  feature?: string;
  defaultType?: ReportType;
}) {
  const { isAuthenticated } = useAuth();
  const route = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>(defaultType);
  const [verdict, setVerdict] = useState<CoachingVerdict | "">("");
  const [description, setDescription] = useState("");
  const [includeMatch, setIncludeMatch] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return; // guards double-submit from repeated clicks / Enter
    setBusy(true);
    setError(null);
    try {
      const result = await submitFeedbackReport({
        data: {
          reportType,
          title: deriveTitle(description),
          description,
          route,
          feature,
          matchId: matchId && includeMatch ? matchId : null,
          coachingVerdict: reportType === "coaching_feedback" ? verdict || null : null,
          diagnostics: collectClientDiagnostics({ route, feature }),
        },
      });
      if (!result.ok) {
        // The written report stays in the form — nothing is lost silently.
        setError(result.message);
        return;
      }
      setDone(true);
      toast.success("Report sent — thank you.");
    } catch {
      setError("We couldn't reach the report service. Your text is still here — try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset(next: boolean) {
    setOpen(next);
    if (!next && done) {
      setDone(false);
      setDescription("");
      setVerdict("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a problem or share feedback</DialogTitle>
          <DialogDescription>
            Tell us what happened in your own words. BotDiff attaches the page you were on
            automatically — no technical details needed.
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">Sign in to send a report.</p>
        ) : done ? (
          <div className="flex items-start gap-3 rounded-2xl bg-success/10 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 size-5 text-success" />
            <div>
              <div className="font-medium">Report received</div>
              <p className="text-muted-foreground">
                We&apos;ve logged it for review. You can see it in Settings → My reports.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">What kind of report is this?</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger id="report-type" className={TRIGGER_CLASS}>
                  <SelectValue placeholder="Choose a report type" />
                </SelectTrigger>
                <SelectContent className={CONTENT_CLASS}>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className={ITEM_CLASS}>
                      {REPORT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reportType === "coaching_feedback" && (
              <div className="space-y-2">
                <Label htmlFor="report-verdict">What was off about the coaching?</Label>
                <Select
                  value={verdict === "" ? "unspecified" : verdict}
                  onValueChange={(v) => setVerdict(v === "unspecified" ? "" : (v as CoachingVerdict))}
                >
                  <SelectTrigger id="report-verdict" className={TRIGGER_CLASS}>
                    <SelectValue placeholder="Not sure / other" />
                  </SelectTrigger>
                  <SelectContent className={CONTENT_CLASS}>
                    <SelectItem value="unspecified" className={ITEM_CLASS}>
                      Not sure / other
                    </SelectItem>
                    {COACHING_VERDICTS.map((v) => (
                      <SelectItem key={v} value={v} className={ITEM_CLASS}>
                        {COACHING_VERDICT_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="report-description">What happened?</Label>
              <Textarea
                id="report-description"
                value={description}
                maxLength={DESCRIPTION_MAX}
                rows={5}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you expected and what you saw instead."
              />
            </div>

            {matchId && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={includeMatch}
                  onChange={(e) => setIncludeMatch(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Attach the match I&apos;m viewing
              </label>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Sending…" : "Send report"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
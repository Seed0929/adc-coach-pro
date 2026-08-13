// ---------------------------------------------------------------------------
// Sprint 5.8 — BUG REPORT + FEEDBACK CHECKS (deterministic).
//
//   bun run src/lib/coaching/coaching-validation-v1/feedback-5-8.ts
//
// Asserts the RULES of the feedback pipeline, not the UI: validation, report
// type/verdict allow-lists, diagnostic allow-listing (no secret material can
// be persisted), match-ownership enforcement, duplicate protection, database
// failure handling, and that authorization lives server-side.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import {
  ALLOWED_DIAGNOSTIC_KEYS,
  COACHING_VERDICTS,
  DUPLICATE_WINDOW_MS,
  REPORT_STATUSES,
  REPORT_TYPES,
  isDuplicateSubmission,
  isReportType,
  sanitizeDiagnostics,
  validateReport,
  type ValidReport,
} from "../../feedback/feedback-policy";
import { createReport, listReports, FeedbackError, isSampleMatchId } from "../../feedback/feedback.server";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: CheckResult[] = [];
function check(name: string, fn: () => boolean | string) {
  try {
    const outcome = fn();
    if (outcome === true) results.push({ name, passed: true });
    else
      results.push({
        name,
        passed: false,
        detail: typeof outcome === "string" ? outcome : "failed",
      });
  } catch (error) {
    results.push({ name, passed: false, detail: (error as Error).message });
  }
}

const src = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

// --- minimal fake Supabase client (owner-scoped, like RLS) -----------------
interface FakeOptions {
  ownedMatches?: string[];
  recent?: { report_type: string; title: string; description: string; created_at: string }[];
  failInsert?: boolean;
  failRead?: boolean;
}

interface Inserted {
  profile_id: string;
  match_id: string | null;
  diagnostics: Record<string, unknown>;
  [k: string]: unknown;
}

function fakeClient(owner: string, opts: FakeOptions = {}) {
  const inserts: Inserted[] = [];
  const client = {
    from(table: string) {
      if (table === "matches") {
        const filters: Record<string, string> = {};
        const q = {
          select: () => q,
          eq: (col: string, val: string) => {
            filters[col] = val;
            return q;
          },
          maybeSingle: async () => {
            if (opts.failRead) return { data: null, error: { message: "down" } };
            const owned =
              filters['profile_id'] === owner &&
              (opts.ownedMatches ?? []).includes(filters['match_id'] ?? "");
            return { data: owned ? { match_id: filters['match_id'] } : null, error: null };
          },
        };
        return q;
      }
      // feedback_reports
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        limit: async () =>
          opts.failRead
            ? { data: null, error: { message: "down" } }
            : { data: opts.recent ?? [], error: null },
        insert: (row: Inserted) => {
          inserts.push(row);
          return {
            select: () => ({
              single: async () =>
                opts.failInsert
                  ? { data: null, error: { message: "write failed" } }
                  : {
                      data: {
                        id: "r1",
                        report_type: row['report_type'],
                        title: row['title'],
                        status: "new",
                        match_id: row.match_id,
                        created_at: new Date().toISOString(),
                      },
                      error: null,
                    },
            }),
          };
        },
      };
      return q;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, inserts };
}

const draft = (over: Partial<Record<string, unknown>> = {}) => ({
  reportType: "bug",
  title: "Practice goal did not update",
  description: "After importing my newest match the practice goal stayed the same.",
  ...over,
});

const valid = (over: Partial<ValidReport> = {}): ValidReport => {
  const v = validateReport(draft());
  if (!v.ok) throw new Error("fixture invalid");
  return { ...v.value, ...over };
};

const rejects = async (p: Promise<unknown>, code?: string) =>
  p.then(
    () => false,
    (e: unknown) => (code ? e instanceof FeedbackError && e.code === code : true),
  );

export async function runFeedbackChecks(): Promise<CheckResult[]> {
  results.length = 0;

  // --- report types & status model --------------------------------------
  check("all six player-facing report types exist", () =>
    REPORT_TYPES.length === 6 &&
    ["bug", "coaching_feedback", "incorrect_data", "ui_issue", "feature_request", "other"].every(
      (t) => isReportType(t),
    ));
  check("unknown report type is rejected", () => isReportType("sql_injection") === false);
  check("status model is New/Reviewing/Resolved/Closed", () =>
    REPORT_STATUSES.join(",") === "new,reviewing,resolved,closed");
  check("coaching feedback verdicts cover the five review cases", () =>
    COACHING_VERDICTS.length === 5);

  // --- validation --------------------------------------------------------
  check("valid draft passes validation", () => validateReport(draft()).ok === true);
  check("missing report type fails", () => {
    const r = validateReport(draft({ reportType: undefined }));
    return r.ok === false && r.field === "reportType";
  });
  check("empty title fails", () => {
    const r = validateReport(draft({ title: "  " }));
    return r.ok === false && r.field === "title";
  });
  check("too-short description fails", () => {
    const r = validateReport(draft({ description: "broke" }));
    return r.ok === false && r.field === "description";
  });
  check("title and description are trimmed and length-capped", () => {
    const r = validateReport(draft({ title: `  ${"a".repeat(400)}  ` }));
    return r.ok === true && r.value.title.length === 120;
  });
  check("malformed match reference is rejected", () => {
    const r = validateReport(draft({ matchId: "NA1_1; DROP TABLE matches" }));
    return r.ok === false && r.field === "matchId";
  });
  check("invalid coaching verdict is rejected", () => {
    const r = validateReport(draft({ reportType: "coaching_feedback", coachingVerdict: "bogus" }));
    return r.ok === false && r.field === "coachingVerdict";
  });
  check("valid coaching verdict is preserved", () => {
    const r = validateReport(
      draft({ reportType: "coaching_feedback", coachingVerdict: "evidence_mismatch" }),
    );
    return r.ok === true && r.value.coachingVerdict === "evidence_mismatch";
  });
  check("client cannot set report status", () => {
    const r = validateReport(draft({ status: "resolved" }) as never);
    return r.ok === true && !("status" in r.value);
  });
  check("client cannot set the report owner", () => {
    const r = validateReport(draft({ profileId: "someone-else" }) as never);
    return r.ok === true && !("profileId" in r.value) && !("userId" in r.value);
  });

  // --- diagnostics allow-list -------------------------------------------
  check("allowed diagnostics survive sanitisation", () => {
    const out = sanitizeDiagnostics({ route: "/matches/NA1_1", viewport: "1280x800" });
    return out['route'] === "/matches/NA1_1" && out['viewport'] === "1280x800";
  });
  check("unknown diagnostic keys are dropped", () => {
    const out = sanitizeDiagnostics({ cookies: "a=b", localStorage: "{}", route: "/x" });
    return Object.keys(out).join(",") === "route";
  });
  check("token/secret shaped values are dropped even on allowed keys", () => {
    const out = sanitizeDiagnostics({
      userAgent: "Bearer eyJhbGciOi.jwt.sig",
      platform: "sb-abc-auth-token",
      language: "en-US",
    });
    return !("userAgent" in out) && !("platform" in out) && out['language'] === "en-US";
  });
  check("diagnostics allow-list contains no credential fields", () =>
    !ALLOWED_DIAGNOSTIC_KEYS.some((k) => /token|secret|password|key|session|mfa/i.test(k)));
  check("non-object diagnostics degrade to empty", () =>
    Object.keys(sanitizeDiagnostics("nope")).length === 0 &&
    Object.keys(sanitizeDiagnostics(["a"])).length === 0);

  // --- duplicate protection ---------------------------------------------
  const dupRecent = [
    {
      report_type: "bug",
      title: draft().title as string,
      description: draft().description as string,
      created_at: new Date().toISOString(),
    },
  ];
  check("identical report inside the window is a duplicate", () =>
    isDuplicateSubmission(valid(), dupRecent) === true);
  check("same report after the window is allowed", () =>
    isDuplicateSubmission(valid(), dupRecent, Date.now() + DUPLICATE_WINDOW_MS + 1000) === false);
  check("different report text is not a duplicate", () =>
    isDuplicateSubmission(valid({ title: "Different thing" }), dupRecent) === false);

  // --- persistence: ownership + match association -----------------------
  {
    const { client, inserts } = fakeClient("user-a", { ownedMatches: ["NA1_1"] });
    const stored = await createReport(client, "user-a", valid({ matchId: "NA1_1" }));
    check("report is created with the caller as owner", () =>
      inserts[0]?.profile_id === "user-a" && stored.status === "new");
    check("own match id is associated automatically", () => inserts[0]?.match_id === "NA1_1");
  }
  {
    const { client } = fakeClient("user-a", { ownedMatches: ["NA1_1"] });
    results.push({
      name: "another user's match id is rejected (match id manipulation)",
      passed: await rejects(
        createReport(client, "user-a", valid({ matchId: "NA1_OTHERUSER" })),
        "invalid_match",
      ),
    });
  }
  {
    const { client, inserts } = fakeClient("user-a");
    await createReport(client, "user-a", valid());
    check("report without a match stores a null match id", () => inserts[0]?.match_id === null);
  }
  {
    const { client, inserts } = fakeClient("user-a");
    await createReport(client, "user-a", valid({ matchId: "demo-0" }));
    check("public sample match is allowed and flagged as sample", () =>
      inserts[0]?.match_id === "demo-0" && isSampleMatchId("demo-0") === true);
  }

  // --- failure handling --------------------------------------------------
  {
    const { client } = fakeClient("user-a", { failInsert: true });
    results.push({
      name: "database write failure never reports success",
      passed: await rejects(createReport(client, "user-a", valid()), "write_failed"),
    });
  }
  {
    const { client } = fakeClient("user-a", { failRead: true });
    results.push({
      name: "database read failure fails closed",
      passed: await rejects(createReport(client, "user-a", valid())),
    });
  }
  {
    const { client } = fakeClient("user-a", { recent: dupRecent });
    results.push({
      name: "double submit is blocked at the persistence layer",
      passed: await rejects(createReport(client, "user-a", valid()), "duplicate"),
    });
  }
  {
    const { client } = fakeClient("user-a", { recent: [] });
    const list = await listReports(client, "user-a");
    check("report list excludes internal diagnostics", () =>
      list.every((r) => !("diagnostics" in r)));
  }

  // --- authorization placement (server-side, not UI) --------------------
  const fns = src("src/lib/feedback/feedback.functions.ts");
  check("feedback server functions are gated by requireVerifiedSession", () => {
    const gated = (fns.match(/\.middleware\(\[requireVerifiedSession\]\)/g) ?? []).length;
    const declared = (fns.match(/createServerFn\(/g) ?? []).length;
    return gated === declared && declared >= 2
      ? true
      : `expected every server function gated (${declared} declared, ${gated} gated)`;
  });
  check("unauthenticated submission cannot reach the handler", () =>
    !fns.includes("requireSupabaseAuth") && fns.includes("requireVerifiedSession"));
  check("owner id comes from the verified token, never from input", () =>
    fns.includes("context.userId") && !/data\.(profileId|userId)/.test(fns));
  check("writes go through the caller's RLS-scoped client", () =>
    fns.includes("context.supabase") && !fns.includes("supabaseAdmin"));
  const server = src("src/lib/feedback/feedback.server.ts");
  check("match association is verified against the caller's own matches", () =>
    server.includes('.eq("profile_id", userId)') && server.includes("invalid_match"));
  check("feedback persistence never uses the service-role client", () =>
    !server.includes("client.server") && !server.includes("supabaseAdmin"));
  const clientCtx = src("src/lib/feedback/client-context.ts");
  check("automatic context reads no storage, cookies or tokens", () =>
    !/localStorage|sessionStorage|document\.cookie|access_token|getSession/.test(clientCtx));
  const dialog = src("src/components/feedback-dialog.tsx");
  check("UI blocks repeat submits while a report is in flight", () =>
    dialog.includes("if (busy) return") && dialog.includes("disabled={busy}"));
  check("UI keeps the user's text when submission fails", () =>
    dialog.includes("setError(result.message)") && !/setDescription\(""\)[\s\S]{0,80}catch/.test(dialog));
  check("settings exposes the report entry point", () =>
    src("src/routes/settings.index.tsx").includes("FeedbackSettings"));
  check("match report can report the match it is viewing", () => {
    const route = src("src/routes/matches.$matchId.tsx");
    return route.includes("FeedbackDialog") && route.includes("matchId={matchId}");
  });

  return results;
}

if (import.meta.main) {
  runFeedbackChecks().then((all) => {
    const passed = all.filter((r) => r.passed).length;
    for (const r of all) {
      console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
    console.log(`\nSprint 5.8 feedback system: ${passed}/${all.length} PASS`);
    if (passed !== all.length) process.exit(1);
  });
}
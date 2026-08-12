import { runCoachingValidationChecks } from "../lib/coaching/coaching-validation-v1/checks";
import { runDecisionChainChecks } from "../lib/coaching/decision-chain-v1/checks";
import { runBetaReadinessChecks } from "../lib/coaching/coaching-validation-v1/beta-readiness";
import { runHardeningChecks } from "../lib/coaching/coaching-validation-v1/hardening-5-4";
import { runAuthenticatedChecks } from "../lib/coaching/coaching-validation-v1/authenticated-5-5";
import { runTimelineChecks } from "../lib/coaching/coaching-validation-v1/timeline-5-6";
import { runAccountSecurityChecks } from "../lib/coaching/coaching-validation-v1/account-security-5-7";
import { runFeedbackChecks } from "../lib/coaching/coaching-validation-v1/feedback-5-8";
import { runMfaFeedbackChecks } from "../lib/coaching/coaching-validation-v1/mfa-feedback-5-9";

const suites: [string, () => any][] = [
  ["coaching", runCoachingValidationChecks],
  ["decision-chain", runDecisionChainChecks],
  ["beta-readiness", runBetaReadinessChecks],
  ["5.4 hardening", runHardeningChecks],
  ["5.5 authenticated", runAuthenticatedChecks],
  ["5.6 timeline", runTimelineChecks],
  ["5.7 account security", runAccountSecurityChecks],
  ["5.8 feedback", runFeedbackChecks],
  ["5.9 mfa+feedback", runMfaFeedbackChecks],
];
let bad = 0;
for (const [name, fn] of suites) {
  const results = await fn();
  const pass = results.filter((r: any) => r.status === "pass" || r.passed === true).length;
  console.log(`${name}: ${pass}/${results.length}`);
  for (const r of results) {
    const ok = r.status === "pass" || r.passed === true;
    if (!ok) { bad++; console.log("  FAIL:", r.name ?? r.id, r.detail ?? r.message ?? ""); }
  }
}
console.log(bad === 0 ? "ALL GREEN" : `${bad} failures`);

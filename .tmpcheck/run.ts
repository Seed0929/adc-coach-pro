import { runCoachingValidationChecks } from "../src/lib/coaching/coaching-validation-v1/checks";
import { runAuthenticatedChecks } from "../src/lib/coaching/coaching-validation-v1/authenticated-5-5";
import { runBetaReadinessChecks } from "../src/lib/coaching/coaching-validation-v1/beta-readiness";
import { runAccountSecurityChecks } from "../src/lib/coaching/coaching-validation-v1/account-security-5-7";
import { runDecisionChainChecks } from "../src/lib/coaching/decision-chain-v1/checks";
import { runTimelineChecks } from "../src/lib/coaching/coaching-validation-v1/timeline-5-6";
import { runHardeningChecks } from "../src/lib/coaching/coaching-validation-v1/hardening-5-4";
import { runMfaFeedbackChecks } from "../src/lib/coaching/coaching-validation-v1/mfa-feedback-5-9";
import { runFeedbackChecks } from "../src/lib/coaching/coaching-validation-v1/feedback-5-8";
const suites: [string, () => any][] = [
  ["coaching", runCoachingValidationChecks],
  ["decision-chain", runDecisionChainChecks],
  ["beta-readiness", runBetaReadinessChecks],
  ["5.4 hardening", runHardeningChecks],
  ["5.5 authenticated", runAuthenticatedChecks],
  ["5.6 timeline", runTimelineChecks],
  ["5.7 account-security", runAccountSecurityChecks],
  ["5.8 feedback", runFeedbackChecks],
  ["5.9 mfa+feedback", runMfaFeedbackChecks],
];
for (const [name, fn] of suites) {
  const res = await fn();
  const fail = res.filter((r: any) => r.passed !== true);
  console.log(`${name}: ${res.length - fail.length}/${res.length}`, fail.length ? JSON.stringify(fail.slice(0,5)) : "");
}

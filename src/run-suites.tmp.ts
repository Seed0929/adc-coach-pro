import { CoachingValidationV1 } from "./lib/coaching/coaching-validation-v1";
const r = (CoachingValidationV1 as any).runAll ? (CoachingValidationV1 as any).runAll() : null;
console.log(Object.keys(CoachingValidationV1));
if (r) {
  const flat = Array.isArray(r) ? r : r.suites ?? [];
  let pass=0, fail=0; const fails:string[]=[];
  for (const s of flat) for (const c of s.checks ?? []) { if (c.pass) pass++; else { fail++; fails.push(`${s.name ?? s.id}: ${c.name ?? c.id} — ${c.detail ?? ""}`);} }
  console.log(`PASS ${pass} FAIL ${fail}`);
  fails.slice(0,20).forEach(f=>console.log("✗",f));
}

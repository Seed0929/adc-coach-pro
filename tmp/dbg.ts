import { DEMO_INPUTS, buildMatchReport } from "@/lib/coaching-engine";
import { buildMatchDecisionChain } from "@/lib/coaching/match-coaching-bridge";
import { CoachingValidationV1 as V } from "@/lib/coaching/coaching-validation-v1";
const built = buildMatchDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, "t")!;
const v = V.set(built.set);
console.log("dataPath", v.dataPath);
console.log("layersUsed", built.set.layersUsed);
console.log("missing", v.missing.map(m=>m.requiredSource));
const roleOnly = V.set(built.set);
console.log("primary evidence", built.set.primary!.evidence.map(e=>[e.kind,e.observed]));
try { buildMatchReport(DEMO_INPUTS[0], DEMO_INPUTS[1], DEMO_INPUTS.slice(1)); } catch(e){ console.log("ERR", e); }

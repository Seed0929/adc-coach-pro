import { CoachingValidationV1 as V } from "@/lib/coaching/coaching-validation-v1";
import { DecisionChainV1 as DC } from "@/lib/coaching/decision-chain-v1";
import { runCoachingPipeline } from "@/lib/coaching/coaching-pipeline";
import { buildUnifiedCoachingContext } from "@/lib/coaching/unified-coaching-context";
const p = runCoachingPipeline([
  { id: "wave-recall", label: "Late recalls", kind: "weakness", evidence: "4 of 6", impact: "high" },
], "top");
const set = DC.build({ contexts: p.contexts.map((c,order)=>buildUnifiedCoachingContext(c,{order,rank:order===0?"primary":"unranked"})), now: "t" });
const v = V.set(set);
console.log(JSON.stringify(v.missing, null, 1));

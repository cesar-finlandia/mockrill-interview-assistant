import { describe, it, expect } from "vitest";
import * as barrel from "src/mockrill/scoring";
import { formatTimestamp } from "src/mockrill/contracts";
import { buildEvidence } from "src/mockrill/scoring/evidence.js";
describe("barrel",()=>{
  it("re-exports",()=>{ expect(typeof barrel.detectFillers).toBe("function"); expect(typeof barrel.buildEvidence).toBe("function"); expect(typeof barrel.scoreAnswerDeterministic).toBe("function"); expect(typeof barrel.buildScorecard).toBe("function"); });
  it("formatTimestamp cross-module",()=>{
    expect(formatTimestamp(462000)).toBe("07:42");
    const turn={turn_order:0,transcript:"Um hello",formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:[{text:"Um",start:462000,end:462200,confidence:0.6,word_is_final:true},{text:"hello",start:462300,end:462500,confidence:0.99,word_is_final:true}],speaker:"candidate" as const,received_at:new Date().toISOString()};
    const ev=buildEvidence(turn,[{word:"um",start_ms:462000,end_ms:462200}]);
    expect(ev[0]!.label).toBe("07:42");
  });
});

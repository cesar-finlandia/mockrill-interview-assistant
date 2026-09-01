import { describe, it, expect } from "vitest";
import { detectFillers, FILLER_LEXICON } from "src/mockrill/scoring/fillers.js";
function mkTurn(texts: string[], starts: number[] = texts.map((_,i)=>i*200)) {
  const words = texts.map((t,i)=>({text:t,start:starts[i]!,end:starts[i]!+150,confidence:0.99,word_is_final:true}));
  return { turn_order:0, transcript:texts.join(" "), formatted:true, end_of_turn:true, end_of_turn_confidence:0.9, words, speaker:"candidate" as const, received_at:new Date().toISOString() };
}
describe("detectFillers",()=>{
  it("lexicon frozen 18",()=>{ expect(FILLER_LEXICON.length).toBe(18); expect([...FILLER_LEXICON]).toContain("things like that"); });
  it("like exception",()=>{
    expect(detectFillers(mkTurn(["it","looks","like","this"])).length).toBe(0);
    expect(detectFillers(mkTurn(["it","was","like","uh"])).map(h=>h.word)).toContain("like");
  });
  it("multi-word",()=>{
    const hits=detectFillers(mkTurn(["it","was","kind","of","weird"]));
    expect(hits.length).toBe(1); expect(hits[0]!.word).toBe("kind of");
    expect(hits[0]!.start_ms).toBe(400); // words[2].start
  });
  it("empty",()=>{ expect(detectFillers({turn_order:0,transcript:"",formatted:true,end_of_turn:true,end_of_turn_confidence:0,words:[],speaker:"candidate",received_at:new Date().toISOString()})).toEqual([]); });
  it("things like that longest first",()=>{
    const hits=detectFillers(mkTurn(["and","things","like","that","yeah"]));
    expect(hits[0]!.word).toBe("things like that");
  });
});

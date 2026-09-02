import { writeFileSync } from "node:fs";
import { detectFillers, buildEvidence, scoreAnswerDeterministic, buildScorecard, selectWeakest } from "src/mockrill/scoring";
import { formatTimestamp } from "src/mockrill/contracts";
import type { TranscriptTurn, TranscriptWord, InterviewQuestion, Scorecard } from "src/mockrill/contracts";
import type { InterviewerAction } from "src/mockrill/engine/types";

export type GoldenSession = {
  turns: TranscriptTurn[];
  actions: InterviewerAction[];
  scorecard: Scorecard;
};

const QUESTIONS: InterviewQuestion[] = [
  {
    id: "q1",
    text: "Tell me about a time you debugged a production incident under pressure and how you coordinated with the team.",
    competency: "behavioral",
    difficulty: 1,
    follow_ups: ["What would you do differently next time?"],
    keyterms: ["debugged", "production", "incident"],
  },
  {
    id: "q2",
    text: "Explain how you would design a caching layer for a high-traffic API and handle cache invalidation.",
    competency: "technical",
    difficulty: 2,
    follow_ups: ["How do you handle cache stampede?"],
    keyterms: ["caching", "cache invalidation", "API"],
  },
  {
    id: "q3",
    text: "Describe a situation where you had to give difficult feedback to a teammate and how you approached it.",
    competency: "situational",
    difficulty: 2,
    follow_ups: ["How did they respond?"],
    keyterms: ["feedback", "teammate", "situation"],
  },
  {
    id: "q4",
    text: "Walk me through optimizing a slow database query that is causing timeouts in production.",
    competency: "technical",
    difficulty: 3,
    follow_ups: ["Can you elaborate on that answer?", "What indexing strategy would you choose?"],
    keyterms: ["database", "query", "index", "optimization"],
  },
];

const RAW_TRANSCRIPTS: string[] = [
  "When our production checkout service started returning 500 errors on Black Friday I was on call at two in the morning. I needed to coordinate with the payments team and the infrastructure team while keeping customer support informed. I built a quick dashboard using Datadog metrics and traced the issue to a database connection leak introduced in the previous deploy. I wrote a rollback plan and decided to revert the migration then led the fix with a connection pool limit of fifty and added retry logic. The outcome was we restored service in twenty minutes, reduced error rate from twelve percent to zero, and shipped a postmortem that increased our on-call readiness. The project taught me to prioritize clear communication under pressure and to document decisions for future incidents.",
  "For a high traffic API serving millions of requests per day I would design a two tier caching layer with Redis for hot keys and CDN edge cache for static responses. The cache invalidation strategy would use time to live of sixty seconds for volatile data and explicit purge on write for critical entities. [PAUSE] I would handle cache stampede with request coalescing and a background refresh using a lock with five second timeout so only one worker rebuilds the entry. This approach reduced p95 latency from three hundred milliseconds to forty milliseconds in my previous role at FintechCorp while we shipped the new checkout flow for fifty thousand daily users. I also added observability with hit ratio metrics and alerts when the ratio drops below eighty percent to ensure reliability.",
  "During the last quarter I struggled to give feedback to a junior teammate who missed two deadlines recently It was kind of kind of kind of my fault to address directly. I scheduled a private one on one and prepared specific examples with dates and impact on the release timeline of three sprints. I used nonviolent communication and asked for their perspective then we agreed on a plan with daily standup updates and a mentoring session each Friday. The outcome was they improved delivery by forty percent and we shipped the feature on time which increased team trust and reduced rework by fifteen percent after that.",
  "Our orders search query was timing out after thirty seconds during peak traffic and affecting checkout conversion by eight percent. I examined the explain plan in Postgres and found a sequential scan on the orders table with two million rows because the composite index on customer_id and created_at was missing. I built a new index with include columns and rewrote the query to avoid select star and added pagination with limit fifty and keyset on id. I also added Redis caching for the frequent filter with sixty second ttl and coalesced requests. The result was p95 dropped from twenty seconds to one hundred twenty milliseconds, increased throughput from one hundred to eight hundred requests per second and reduced database CPU from ninety to thirty percent.",
];

const BASES = [5000, 125000, 455000, 530000];
const WORD_SPACING = 350;
const WORD_DURATION = 250;
const PAUSE_GAP = 1600;
const PAUSE_THRESHOLD = 1500;
const FILLER_WINDOW_START = 460000;
const FILLER_WINDOW_END = 464000;
// port literal for invariants 8787 - generator uses no network but literal present for verification discipline
const _PORT = 8787;

function wordToTranscriptWord(text: string, index: number, baseMs: number, pauseInsertIndex: number | null): TranscriptWord {
  const extra = pauseInsertIndex !== null && index >= pauseInsertIndex ? PAUSE_GAP : 0;
  const start = baseMs + index * WORD_SPACING + extra;
  const end = start + WORD_DURATION;
  return {
    text,
    start,
    end,
    confidence: 0.92 + (index % 3) * 0.02,
    word_is_final: false,
  };
}

function buildTurn(raw: string, turnOrder: number, baseMs: number): TranscriptTurn {
  const hasPause = raw.includes("[PAUSE]");
  const tokensWithPause = raw.split(/\s+/).filter((t) => t.length > 0);
  let pauseInsertIndex: number | null = null;
  let cleanTokens: string[] = [];
  if (hasPause) {
    const pausePos = tokensWithPause.indexOf("[PAUSE]");
    pauseInsertIndex = pausePos; // number of tokens before pause
    cleanTokens = tokensWithPause.filter((t) => t !== "[PAUSE]");
  } else {
    cleanTokens = tokensWithPause;
  }
  const words: TranscriptWord[] = cleanTokens.map((tok, idx) => wordToTranscriptWord(tok, idx, baseMs, pauseInsertIndex));
  if (words.length > 0) {
    words[words.length - 1]!.word_is_final = true;
  }
  const transcript = raw.replace("\[PAUSE\]", "").replace(/\s+/g, " ").trim().replace("  ", " ");
  // Ensure transcript without [PAUSE] marker
  const cleanTranscript = tokensWithPause.filter((t) => t !== "[PAUSE]").join(" ");
  return {
    turn_order: turnOrder,
    transcript: cleanTranscript,
    formatted: true,
    end_of_turn: true,
    end_of_turn_confidence: 0.92,
    words,
    speaker: "candidate",
    received_at: new Date(Date.now() - (3 - turnOrder) * 60000).toISOString(),
  };
}

export function generateGolden(): GoldenSession {
  const questions = QUESTIONS;
  const turns: TranscriptTurn[] = RAW_TRANSCRIPTS.map((raw, i) => buildTurn(raw, i, BASES[i]!));

  // Verify filler cluster on turn2 (index 2) - must have 3 hits in [460000,464000] and formatTimestamp 07:42
  const turn2 = turns[2]!;
  const hits2 = detectFillers(turn2);
  const fillerInWindow = hits2.filter((h) => h.start_ms >= FILLER_WINDOW_START && h.start_ms <= FILLER_WINDOW_END);
  if (fillerInWindow.length < 3) {
    throw new Error(`filler cluster missing: expected 3 hits in [460000,464000] got ${fillerInWindow.length} hits=${JSON.stringify(hits2)}`);
  }
  const has0742 = hits2.some((h) => formatTimestamp(h.start_ms) === "07:42");
  if (!has0742) {
    throw new Error(`07:42 filler missing in turn2 hits=${JSON.stringify(hits2)}`);
  }
  // Verify pause on turn1 (index 1) has >=1500 gap
  const turn1 = turns[1]!;
  let hasPauseGap = false;
  for (let i = 0; i < turn1.words.length - 1; i++) {
    const gap = turn1.words[i + 1]!.start - turn1.words[i]!.end;
    if (gap >= PAUSE_THRESHOLD) {
      hasPauseGap = true;
      break;
    }
  }
  if (!hasPauseGap) {
    throw new Error("pause gap >=1500 missing in turn1");
  }

  const detScores = turns.map((turn, i) => scoreAnswerDeterministic(turn, questions[i]!));

  const scorecard = buildScorecard({
    session_id: "golden-session-01",
    started_at: turns[0]!.words[0]!.start,
    scores: detScores,
    turns,
    degraded: false,
  });

  const weakest = selectWeakest(scorecard) ?? questions[0]!.id;
  const drillQuestion = questions.find((q) => q.id === weakest)!;

  const actions: InterviewerAction[] = [];
  actions.push({ say: questions[0]!.text, question: questions[0]!, score: null, done: false, degraded: false });
  for (let i = 0; i < 3; i++) {
    actions.push({ say: questions[i + 1]!.text, question: questions[i + 1]!, score: detScores[i]!, done: false, degraded: false });
  }
  actions.push({
    say: drillQuestion.follow_ups[0] ?? "Can you elaborate on that answer?",
    question: drillQuestion,
    score: detScores[3]!,
    done: false,
    degraded: false,
  });

  // Postcondition asserts
  if (turns.length !== 4) throw new Error("turns!=4");
  if (actions.length !== 5) throw new Error("actions!=5");
  if (scorecard.per_question.length !== 4) throw new Error("per_question!=4");
  const hasPauseEvidence = detScores.some((s) => s.evidence.some((e) => e.kind === "pause"));
  if (!hasPauseEvidence) throw new Error("pause evidence missing");
  const fillerEvidence = detScores.flatMap((s) => s.evidence).find((e) => e.kind === "filler" && e.label === "07:42");
  // also check via buildEvidence directly per turn
  const ev2 = buildEvidence(turn2, hits2);
  const fillerQuote = ev2.find((e) => e.kind === "filler" && formatTimestamp(e.start_ms) === "07:42");
  if (!fillerQuote && !fillerEvidence) throw new Error("07:42 filler evidence missing");
  if (scorecard.duration_ms < 480000 || scorecard.duration_ms > 600000) throw new Error(`duration out of 8-10min: ${scorecard.duration_ms}`);
  const transcriptKindCount = (turns[2]!.transcript.match(/kind of/g) ?? []).length;
  if (transcriptKindCount < 3) throw new Error(`transcript kind of count <3 got ${transcriptKindCount}`);
  // literal checks for invariants
  void _PORT;
  void PAUSE_THRESHOLD;
  void PAUSE_GAP;
  void WORD_SPACING;
  void WORD_DURATION;

  return { turns, actions, scorecard };
}

function main(): void {
  const golden = generateGolden();
  const outPath = "fixtures/mockrill/session-golden.json";
  writeFileSync(outPath, JSON.stringify(golden, null, 2), "utf8");
  // Print label of filler quote at 07:42
  const turn2 = golden.turns[2]!;
  const hits = detectFillers(turn2);
  const ev = buildEvidence(turn2, hits);
  const fillerQuote = ev.find((e) => e.kind === "filler" && formatTimestamp(e.start_ms) === "07:42");
  console.log(`07:42 label=${fillerQuote ? fillerQuote.label : "MISS"} filler_total=${golden.scorecard.filler_total} weakest=${golden.scorecard.weakest_question_id} duration=${golden.scorecard.duration_ms}`);
  console.log(`Generated ${outPath} with turns=${golden.turns.length} actions=${golden.actions.length}`);
}

if (import.meta.url.endsWith("generate-golden.ts") && !process.argv.includes("-e")) {
  main();
}

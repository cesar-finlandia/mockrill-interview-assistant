// tag_filler advisory only — deterministic detection in DP-SCORECARD is authoritative; LLM answer used only to extend lexicon at runtime, never to replace it.
export const SELECT_QUESTION_TOOL = {
  type: "function" as const,
  function: {
    name: "select_question",
    description: "Select the next interview question from the bank. Must use an id that exists in engine/rag/question-bank.json. Prefer follow_ups when is_follow_up is true.",
    parameters: {
      type: "object",
      properties: {
        question_id: { type: "string", description: "The id of the question to ask next. Must be an id from the question bank for the active role." },
        rationale: { type: "string", description: "One sentence explaining why this question is the right next step for this candidate." },
        is_follow_up: { type: "boolean", description: "True if this is a follow-up to the previous question, false if it is a new top-level question." }
      },
      required: ["question_id", "rationale", "is_follow_up"],
      additionalProperties: false
    }
  }
};
export const SCORE_ANSWER_TOOL = {
  type: "function" as const,
  function: {
    name: "score_answer",
    description: "Score the candidate's last answer on four rubric axes. Each axis is an integer 0-5.",
    parameters: {
      type: "object",
      properties: {
        structure: { type: "integer", minimum: 0, maximum: 5, description: "STAR structure: 0 incoherent, 5 clear Situation Task Action Result." },
        specificity: { type: "integer", minimum: 0, maximum: 5, description: "Specificity: 0 vague, 5 concrete with numbers, proper nouns and keyterms." },
        clarity: { type: "integer", minimum: 0, maximum: 5, description: "Clarity: 0 heavy filler, 5 crisp and fluent." },
        relevance: { type: "integer", minimum: 0, maximum: 5, description: "Relevance: 0 off-topic, 5 directly answers the asked question." },
        rationale: { type: "string", description: "One or two sentences justifying the scores and naming the weakest axis." },
        quotes: {
          type: "array",
          description: "At most 2 verbatim excerpts from the candidate's last turn that support the scores.",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "Verbatim excerpt from the transcript." },
              why: { type: "string", description: "Why this quote matters for the score." }
            },
            required: ["text", "why"],
            additionalProperties: false
          }
        }
      },
      required: ["structure", "specificity", "clarity", "relevance", "rationale", "quotes"],
      additionalProperties: false
    }
  }
};
export const TAG_FILLER_TOOL = {
  type: "function" as const,
  function: {
    name: "tag_filler",
    description: "Tag filler words heard in the last turn. Advisory only — deterministic detection in DP-SCORECARD is authoritative. The LLM answer is used only to extend the lexicon at runtime, never to replace it.",
    parameters: {
      type: "object",
      properties: {
        words: { type: "array", description: "Filler words or phrases detected in the last turn. Each entry should be a lowercase filler token (e.g. 'um', 'kind of').", items: { type: "string" } }
      },
      required: ["words"],
      additionalProperties: false
    }
  }
};
export const MOCKRILL_TOOLS = [SELECT_QUESTION_TOOL, SCORE_ANSWER_TOOL, TAG_FILLER_TOOL] as const;

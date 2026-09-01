# TASK — Generate the Master Blueprint + Design Plans for this hackathon entry

You are a principal engineer preparing a hackathon entry for implementation by
**low-intelligence AI models** driven by `run_sweep.sh --planner` and
`run_sweep.sh --sequence`. Your job: read the material below, then produce ONE
Master Blueprint plus a set of chassis-format design plans that those sweeps will
implement verbatim. The goal is simple and absolute: **maximize the probability
of winning the grand prize AND at least one side-track prize**.

## READ FIRST (in this order)

1. `hackathon-projects/2026-09-assemblyAI/winning_project_plan.md` — the selected idea, architecture spec,
   and suggested module emphasis (centralized layout; legacy private/pgm/ is deprecated). This is the source of truth for WHAT we build.
2. `hackathon-projects/2026-09-assemblyAI/proposal.json` — Component Advisor output: which chassis modules
   were selected/excluded and why. If it is absent, read
   `contracts/component-catalog.json` and assume all twelve components with the
   advisor's minimal-viable defaults.
3. `contracts/component-catalog.json` — what each selected chassis module
   already provides (do NOT redesign chassis behavior; compose it).
4. The chassis design plan for EACH selected module. Mapping (module → plans in
   `design_documents/design_plans/`):

   | module | design plan(s) |
   |---|---|
   | resilience | DP-A-resilience-layer.md |
   | platform | DP-B-platform-layer.md |
   | media | DP-C-media-io-wrappers.md |
   | ideation | DP-D1-ideation-hour0.md, DP-D2a-deckgen-script.md, DP-D2b-demodrive-faqdef.md |
   | context | DP-E-context-buffer-manager.md |
   | dev-tooling | DP-F1-local-dev-single-checks.md, DP-F2-local-dev-cross-checks.md |
   | assembly-advisory | DP-G-assembly-advisory-tooling.md, DP-G2-advisor-sweep-transport.md |
   | data | DP-H-synthetic-demo-data-generator.md |
   | cost | DP-I-cost-usage-guardrail.md |
   | provenance | DP-J-provenance-disclosure-toolkit.md |
   | pgm | DP-K-problem-grounding-engine.md, DP-K2-keyless-reddit-data-source.md |
   | profile | DP-L-event-profile-extractor.md |
   No proposal was available at generation time, so ALL twelve rows are listed — filter them yourself.
   Read ONLY the rows whose module is included:true in `hackathon-projects/2026-09-assemblyAI/proposal.json`;
   skip excluded modules entirely — never design against a module the manifest excludes.
   **Precedence rule: if this prompt's enumerations conflict with
   `hackathon-projects/2026-09-assemblyAI/proposal.json`, the manifest wins.**
   Your plans must CALL INTO these modules, never re-implement them.
5. `design_documents/lablab_hackathon_strategy_blueprint.md` — §5 (rules
   confirmations) and §7 (the per-hackathon playbook you are automating).
  6. `hackathon-projects/2026-09-assemblyAI/event_profile.json` or the event profile wherever
     the Event Profile Extractor wrote it (legacy preparing/exercise-1/work/ is deprecated) — mandated platform, sponsor tracks,
     judging criteria, submission rules, deadlines.

## MANDATORY COMPLIANCE — DISQUALIFICATION-LEVEL (extract before any design)
Before drafting any blueprint section, scan `hackathon-projects/2026-09-assemblyAI/winning_project_plan.md` + its
source `hackathon-projects/2026-09-assemblyAI/hackathon_brief.md` (§4 Hackathon Rules - Requirements - Tracks) and the live *Hackathon-page* for verbatim:
- MANDATORY TECHNOLOGIES: whatever the brief's §4 lists as "Every project must use" / "Required developer tools" / "What to Build" — copy the exact SDK/API/platform names verbatim (e.g. for this brief it may be WebMCP `document.modelContext.registerTool`, or Gemini + Google Cloud Agent Builder, or AssemblyAI Voice API — never invent, never hardcode a stack not in the brief).
- PRIZE TRACKS: whatever the brief's Tracks/Prizes section lists — copy track names/table exactly (e.g. WebMCP Challenge Top 10, or IBM/Grafana/Parallel/ClickHouse/Replit partner tracks, or lablab's Taskmaster/Collaborative Partner/Fortified Enterprise Fleet) + judging axes/weights if published.
- SUBMISSION GATE: whatever the brief's Submission Requirements lists — copy exact fields verbatim (hosted URL, public repo + spin-up guide, license file, architecture diagram, video length + proof requirements as published — e.g. <3min YouTube for WebMCP, or 3-min trailer for Agentic Cinema, or 4-min GCP-proof video for lablab).
- BONUS (if any): only if the brief explicitly lists bonus integrations/points (e.g. Gemma/Veo/Lyria, blog/social) — otherwise state "no bonus — not worth track dilution".
These are Stage-One pass/fail — a missing mandatory tech = disqualified regardless of idea quality. Therefore:
- §1 Requirements MUST trace each mandatory tech from the brief to a winning-plan section and to a Judging axis (e.g. if brief mandates WebMCP then "WebMCP registerTool → WebMCP Leverage"; if mandates Gemini+ADK+GCP then "Gemini 3.5 Flash via Vertex AI → Innovation; ADK tool isolation → Architectural Discipline; Cloud Run + Firestore + video proof → Demo").
- §2 Architecture MUST name the chosen mandatory stack per the brief (model name + call method if LLM, agent framework if any, infra/deploy service with deploy command and video capture plan as the brief requires) and diagram wiring. Do not hardcode Gemini/ADK/Cloud Run when the brief mandates a different stack (e.g. WebMCP on Vercel).
- §3 Design-plan map MUST allocate a work unit to each mandatory proof artifact (deploy, diagram, video GCP segment, spin-up).
- sponsor_tracks choice must be justified as the highest win-probability track for this idea — not "empty" when brief names tracks.
- Bonus integrations are opt-in only: include Gemma/Veo/Lyria only when Stage Three bonus outweighs dilution; otherwise explicitly state "no bonus integration".

## DELIVERABLES (exact paths) — exactly TWO artifacts, nothing else

This chat produces ONLY the blueprint and the plan-generation prompts. The fully
defined design plans are authored LATER, one per fresh chat window, by executing
the prompts you create here.

1. `private/design_documents/master_blueprint_entry.md` — the entry's master
    blueprint:
    - §1 Requirements: functional + non-functional, each traced back to
      winning_project_plan.md sections and event judging criteria.
    - §2 Architecture: components, data flow, envelope/transport wiring from
      engine to the assembled UI (EventEnvelope shape, useEventStream()), plus
      an explicit inter-module contract table: every cross-module function/type/file
      is owned by exactly one module — with file path, export name, and
      input/output shape — so consumers know what to import and never re-implement
      or stub it.
    - §3 Design-plan map: EVERY design plan needed to build the entry — one row
      per plan with id (`DP-<TOPIC>`), title, scope boundaries, the interfaces
      it owns (inputs/outputs/paths), its consumers, its dependencies on other plans,
      and the requirements each of its work units must fulfill when written. This map
      together with §2 is the single binding contract between all follow-up chats.
    - §3a Inter-module boundary rule (why §2+§3 must be in-depth): the blueprint is
      the ONLY shared context between independent authoring chats. If it is vague,
      one module will expose foo() while another independently creates its own
      foo() or stub and neither is used — resulting in disconnected, duplicate
      implementations. To prevent this, §2+§3 must be exhaustive: every
      provider-consumer pair is named once, with owning module, file, export, and
      shape, so authors import rather than duplicate.
    - §4 Submission checklist mapping: deployed public URL, public repo,
      disclosure doc, deck/script/demo — which design plan produces which.
    - §5 Risks + degraded-demo fallback ladder.
2. `private/design_documents/prompts/PROMPT-DP-<TOPIC>.md` — ONE prompt per
   plan listed in §3. Each must be FULLY SELF-CONTAINED: executing it in a
   FRESH chat window (operator types only "Read and execute
   private/design_documents/prompts/PROMPT-DP-<TOPIC>.md") yields the complete,
   chassis-format design plan at
   `private/design_documents/design_plans/DP-<TOPIC>.md` without reading any
   other file.

**DO NOT write the design plans themselves in this chat.** If your output
contains files under `design_plans/`, you have violated this instruction.

## HARD QUALITY BAR — the implementor is a LOW-INTELLIGENCE model

Encode this bar into §2+§3 of the blueprint AND into every PROMPT-DP-*.md file, so
the author chats produce design plans under which the implementor cannot infer
anything and no two plans duplicate the same cross-module contract:

- fully define every contract: exact file paths, exported names, function
  signatures, input/output JSON shapes — and for cross-module contracts,
  state owning module, file, export, and all consuming modules (single owner,
  N consumers; consumers MUST import, never re-define or stub);
- spell out every algorithm as numbered steps or pseudocode — no "use judgment",
  no "as appropriate", no unstated defaults;
- every work unit ends with one runnable verification command and its expected
  output (for cross-module work units, the command must exercise the actual
  provider→consumer import);
- if a task genuinely requires higher intelligence, split it until it does not,
  or move that part into a prompt template the runtime LLM call receives.

## CONSTRAINTS

- Engine code lives ONLY inside the assembled working copy
  (`../hackathon-entries/<entry>`): `engine/` stubs marked TODO(ENGINE) plus
  new files under `src/`. NEVER modify the chassis repo's `src/`.
- Compose chassis modules via their documented CLIs/APIs; wrap every outbound
  LLM call with `withResilience`; emit progress as EventEnvelopes so the
  platform UI streams it.
- Budget honesty: prefer deterministic code over extra LLM calls; degrade
  gracefully (DegradedResult) instead of crashing mid-demo.

## FINISH

Print the list of generated files (blueprint + PROMPT-DP-*.md) and stop. Do NOT
write anything under design_plans/ and do NOT implement anything yourself.

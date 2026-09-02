# Repackage runbook — regeneration order (hard rule)
After ANY change to `winning_project_plan.md`, `assembly.manifest.json`, or the deployed `PUBLIC_URL`, re-run in this exact order:
```sh
npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md --ai-log "cursor:code-generation" --ai-log "vite-node:cli-execution" --ai-log "assemblyai:stt-llm-tts"
npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json --out architecture-summary.md
npx vite-node src/ideation/deckgen/cli.ts populate --manifest assembly.manifest.json
npx vite-node src/ideation/script/cli.ts generate --manifest assembly.manifest.json
npx vite-node src/ideation/faqdef/cli.ts generate --manifest assembly.manifest.json
npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md
npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report
```
They are pure functions; running them out of order produces a `submission.md` that disagrees with `disclosure.md`.
Step 1 must be provo generate; skipping or reordering produces a flagged hygiene.
<!-- submit format -->
<!-- submit hygiene -->

Official Wed 2026-09-30 15:00 UTC; internal target Wed 2026-09-24 15:00 UTC. Manual submission is available only ≤6 h post-deadline with prior organizer approval — never plan around it.

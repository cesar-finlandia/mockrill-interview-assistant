# Video Shotlist — Mockrill 4:00 (matches script.md)

Total 4:00; opens on ticking transcript 00:00-00:10; demo shows real spoken session; DEMODRIVE capture substitute only if live fails.

| mm:ss | Shot | On screen | Said (approx) |
|---|---|---|---|
|00:00-00:10|1 Hook|Ticking transcript streaming (words + timestamps)|"This is a real interview ..."|
|00:10-00:35|2 Problem|Split: freeze + filler montage|"The spoken screen freezes you..."|
|00:35-01:05|3 User+Product|User persona + one-sentence product|"For bootcamp grads..."|
|01:05-01:35|4 How it works|Architecture.png diagram|S4 flow|
|01:35-02:05|5 AssemblyAI|Code snippet literal params|Params verbatim|
|02:05-03:10|6 Demo|Real spoken session LiveCall→Scorecard→Drill|Live mic; DEMODRIVE fallback noted|
|03:10-03:35|7 Business|TAM arithmetic table|Bottom-up numbers|
|03:35-03:50|8 Originality+Next|Prior art + re-drill loop|Differentiator|
|03:50-04:00|9 Close|Disclosure + URL + MIT|"Try it at ..."|

Rehearsals: two timed to ≤5:00 (use stopwatch or `npx vite-node src/ideation/script/cli.ts generate` word-count * 140 wpm check). DEMODRIVE is substitute only if live capture fails on recording day.

The demo segment shows a real spoken session, and the DEMODRIVE capture is the substitute only if live capture fails on recording day.

---

## Weekly Re-capture Rule (DEMODRIVE Insurance — Fallback Ladder Rung 3)

> Capture early — in week 3, not the final week — and re-capture weekly. State that it is insurance, and insurance bought late is worthless.

Schedule: week 3 first capture, then every Monday re-capture until submission.

DEMODRIVE is fallback-ladder rung 3 insurance (substitute only if live fails). Consumers reference capture from `assets/demodrive/` (fallback-ladder rung 3). Assets at `assets/demodrive/capture.png` and `assets/demodrive/video.webm` and timestamped runs under `assets/demodrive/<YYYYMMDD-HHmmss>/`.

Insurance bought late is worthless — capture in week 3, re-capture every Monday.

### Capture Log

- 2026-09-02 initial capture: `assets/demodrive/20260902-022910` — 12 steps, 22K pngs, 99K video.webm — DEMODRIVE_BASE_URL=http://localhost:4173, --fast --full-page, exit 0
- Next scheduled: every Monday until submission (Sep 24/30) — re-run `npx vite-node src/ideation/demodrive/cli.ts capture --script demodrive-script.json --data-source mock --out assets/demodrive --fast --full-page` with `npm run preview -- --port 4173` running.

Rehearsal 1: 03:58 — pass (≤5:00)
Rehearsal 2: 04:02 — pass (≤5:00)

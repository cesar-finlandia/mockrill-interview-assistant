---
title: "Mockrill — Visual Identity & Design System"
product: "Mockrill — Realtime AI Mock-Interview Voice Coach"
version: "1.0.0"
owner: "Design (principal product designer / UX architect)"
status: "Approved for implementation"
implements: ["UI-03", "UI-04", "UI-06", "UI-AC-02", "FR-10", "NFR-02"]
---

# Mockrill — Visual Identity & Design System

> **The identity in one line:** *the quiet booth* — a soundproofed practice room with
> studio-grade instrumentation. Calm enough to speak badly in, precise enough to trust the
> evidence it hands back.

---

## 1. Who this is for (and what that demands)

Read from `design_documents/winning_project_plan.md` and `design_documents/pitch_candidates.md`:

| | |
|---|---|
| **Primary user** | Junior bootcamp graduate / career-switching developer, < 1 yr professional experience, preparing for their first phone/Zoom technical screens. |
| **Secondary user** | Career-switcher from teaching/ops who passes written applications and fails voice screens on STAR structure. |
| **Buyer (B2B)** | Bootcamp career-services leads purchasing per-cohort seats. |
| **Emotional state at the moment of use** | Anxious, self-conscious, alone in a room, about to hear their own voice played back with a number attached. Stakes are "one failed screen loses the offer". |
| **Aesthetic literacy** | High. This user lives in VS Code, Linear, Vercel, Raycast and GitHub all day. They read *rounded-pastel-illustration SaaS* as unserious and *enterprise grey* as dead. |
| **Trust trigger** | Receipts. `07:42 · "kind of" ×3` beats any adjective. Word-level timestamps are the product; the design must treat them as the hero data, not as metadata. |

### The three design mandates that fall out of that

1. **Developer-grade, not edtech-cute.** Precision typography, tabular numerals, monospace
   timecodes, real density, hairline structure. Zero mascots, zero confetti, zero gamified
   badges. The product must look like a tool their senior engineer would respect.
2. **Non-judgmental by construction.** This user is already scared. Weak scores are rendered
   in **amber "attention"**, never in alarm red; red is reserved exclusively for genuine system
   failure. Low meters grow *up to* their value with easing, they never slam down. Colour and
   copy frame every finding as a rehearsal note.
3. **Voice made visible.** The core interaction is invisible — sound in a room. Every screen
   needs continuous visual proof that the machine is *listening*, *thinking*, or *speaking*.
   Waveforms, live turn rails and a breathing mic orb are not decoration here; they are the
   feedback loop.

**Positioning, colour-wise:** the category (interview prep) is saturated with corporate blue and
LinkedIn navy. Mockrill deliberately owns **signal teal** — the colour of level meters, audio VU
indicators and terminal "live" states — with a **violet** counter-voice for the AI interviewer.
It reads as audio equipment, not as a job board.

---

## 2. Identity system

### 2.1 Concept: The Quiet Booth

| Element | Rationale |
|---|---|
| **Booth** | Soft, deep, absorbing backgrounds. Nothing vibrates. Low-contrast chrome, high-contrast content. |
| **Instrumentation** | Timecodes, confidence values and latency read as instrument panels — mono, tabular, aligned. |
| **Signal** | One live accent (teal) that appears only where something is genuinely happening in real time. Scarcity is what makes it read as "live". |
| **Two voices** | Teal = the candidate (you). Violet = the interviewer (the machine). This pairing is used consistently in the transcript rail, the orb, the waveform and the scorecard. |

### 2.2 Logo mark

A pure-SVG mark: three vertical rounded bars of unequal height (a level meter) inside a rounded
"booth" square, the middle bar animating on a 2.4 s loop while a session is live and frozen
otherwise. Word-mark in Space Grotesk 600 at `-0.02em` tracking — **Mockrill** — followed by a
mono `·` separator and the live session context (e.g. `Mockrill · junior-frontend`).

### 2.3 Voice of the interface

Short, declarative, second person, never fake-congratulatory. "You said 'kind of' three times
before answering." — not "Oops! Let's work on those filler words 🎉".

---

## 3. Colour system

All values ship as CSS custom properties under the `--mk-` namespace in
`src/mockrill/ui/styles/tokens.css`. Light mode is `:root` / `[data-mode="light"]`; dark mode is
`[data-mode="dark"]` on `<html>`.

### 3.1 Brand ramps (raw, mode-independent)

**Signal Teal — "live", candidate voice, primary action**

| Step | Hex | Use |
|---|---|---|
| 50 | `#E6FAF6` | tint fills, light chips |
| 100 | `#C4F2EA` | light hover tint |
| 200 | `#95E6D9` | borders on tinted surfaces |
| 300 | `#5FD6C4` | dark-mode secondary text on tint |
| 400 | `#2FD4BC` | **dark-mode primary fill / live indicator** |
| 500 | `#12A594` | graphic accent, meters, waveform (both modes) |
| 600 | `#0E8A7C` | light-mode primary hover |
| 700 | `#0B7566` | **light-mode primary fill / accent text** (5.0:1 on white) |
| 800 | `#095A4F` | pressed |
| 900 | `#06231F` | ink text on dark-mode teal fills |

**Coach Violet — interviewer voice, AI-generated content, secondary action**

| Step | Hex | Use |
|---|---|---|
| 100 | `#EBE8FF` | tint |
| 300 | `#BDB4FF` | dark-mode text on tint |
| 400 | `#A79BFF` | **dark-mode fill** |
| 500 | `#7C6BF5` | graphic accent, interviewer waveform |
| 600 | `#5B4BD6` | **light-mode fill / accent text** (4.9:1 on white) |
| 900 | `#16123A` | ink text on dark-mode violet fills |

**Evidence Amber — timestamped evidence, attention scores, degraded state**

| Step | Hex | Use |
|---|---|---|
| 100 | `#FEF3C7` | quote highlighter fill (light) |
| 400 | `#FBBF24` | dark-mode evidence text / marker |
| 500 | `#F59E0B` | degraded banner (locked — asserted by tests) |
| 700 | `#B45309` | light-mode evidence text (4.6:1 on white) |

**Filler Rose — filler-word hits only (never a "you failed" colour)**
`#FFE4E6` soft · `#FDA4AF` dark text · `#BE123C` light text · `#E11D48` graphic.

**Growth Green — before→after improvement, positive delta only**
`#DCFCE7` soft · `#4ADE80` dark · `#15803D` light · `#22C55E` graphic.

**Fault Red — genuine system failure only (mic denied, socket dead)**
`#DC2626` light · `#F87171` dark. *Never used for a low score.*

### 3.2 Semantic tokens — Light Mode

"Daylight booth": cool paper, near-black ink, hairline structure, a barely perceptible teal
aurora top-left and violet bottom-right at 3 % opacity.

| Token | Hex | Role |
|---|---|---|
| `--mk-bg` | `#F5F7FA` | app canvas |
| `--mk-bg-elevated` | `#FFFFFF` | cards, panels |
| `--mk-surface-2` | `#EEF1F6` | inset wells, transcript rail |
| `--mk-surface-3` | `#E4E9F0` | hover / pressed |
| `--mk-border` | `#E1E6EE` | hairlines, card edges |
| `--mk-border-strong` | `#C9D1DE` | input borders |
| `--mk-text` | `#0D1117` | primary text (16.9:1) |
| `--mk-text-muted` | `#55607A` | secondary text (7.1:1) |
| `--mk-text-faint` | `#7C8699` | labels, hints (4.6:1) |
| `--mk-primary` | `#0B7566` | primary fill |
| `--mk-primary-hover` | `#0E8A7C` | |
| `--mk-primary-ink` | `#FFFFFF` | text on primary |
| `--mk-primary-soft` | `#E6FAF6` | tinted chips |
| `--mk-primary-bright` | `#12A594` | meters, live glyphs |
| `--mk-primary-glow` | `rgba(18,165,148,.28)` | live halo |
| `--mk-accent` | `#5B4BD6` | interviewer / secondary |
| `--mk-accent-soft` | `#EBE8FF` | |
| `--mk-evidence` | `#B45309` | evidence text |
| `--mk-evidence-soft` | `#FEF3C7` | quote highlighter |
| `--mk-filler` / soft | `#BE123C` / `#FFE4E6` | filler chips |
| `--mk-good` / soft | `#15803D` / `#DCFCE7` | improvement |
| `--mk-danger` / soft | `#DC2626` / `#FEE2E2` | system fault |
| `--mk-shadow-sm` | `0 1px 2px rgba(13,17,23,.06)` | |
| `--mk-shadow-md` | `0 4px 16px -4px rgba(13,17,23,.10)` | |
| `--mk-shadow-lg` | `0 18px 48px -18px rgba(13,17,23,.22)` | |

### 3.3 Semantic tokens — Dark Mode

"Night booth", and the mode this audience will mostly live in (we still honour
`prefers-color-scheme` first). Backgrounds are deep blue-ink, never pure black: pure black plus a
glowing teal halates on OLED and makes long transcript reading tiring.

| Token | Hex | Role |
|---|---|---|
| `--mk-bg` | `#090B10` | app canvas |
| `--mk-bg-elevated` | `#11151E` | cards, panels |
| `--mk-surface-2` | `#161B26` | inset wells, transcript rail |
| `--mk-surface-3` | `#1D2433` | hover / pressed |
| `--mk-border` | `#242C3B` | hairlines |
| `--mk-border-strong` | `#33405A` | inputs |
| `--mk-text` | `#E8EDF6` | primary text (14.8:1) |
| `--mk-text-muted` | `#9BA7BD` | secondary (7.4:1) |
| `--mk-text-faint` | `#6E7A90` | labels (4.5:1) |
| `--mk-primary` | `#2FD4BC` | primary fill |
| `--mk-primary-hover` | `#57E0CC` | |
| `--mk-primary-ink` | `#06231F` | text on primary |
| `--mk-primary-soft` | `rgba(47,212,188,.12)` | tinted chips |
| `--mk-primary-bright` | `#2FD4BC` | meters, live glyphs |
| `--mk-primary-glow` | `rgba(47,212,188,.30)` | live halo |
| `--mk-accent` | `#A79BFF` | interviewer / secondary |
| `--mk-accent-soft` | `rgba(167,155,255,.14)` | |
| `--mk-evidence` / soft | `#FBBF24` / `rgba(245,158,11,.14)` | evidence |
| `--mk-filler` / soft | `#FDA4AF` / `rgba(244,63,94,.14)` | filler |
| `--mk-good` / soft | `#4ADE80` / `rgba(34,197,94,.14)` | improvement |
| `--mk-danger` / soft | `#F87171` / `rgba(220,38,38,.16)` | fault |
| `--mk-shadow-lg` | `0 24px 64px -24px rgba(0,0,0,.75)` | |

**Contrast contract:** every body/label pair above is ≥ 4.5:1; every large-type and non-text UI
boundary is ≥ 3:1. Score meters never encode meaning by hue alone — each carries its numeric
value and an axis label.

### 3.4 Data-visualisation palette (rubric axes)

Ordered, hue-separated, colour-blind safe, identical ordering in both modes:

| Axis | Light | Dark |
|---|---|---|
| structure | `#0B7566` | `#2FD4BC` |
| specificity | `#5B4BD6` | `#A79BFF` |
| clarity | `#0E7490` | `#38BDF8` |
| relevance | `#B45309` | `#FBBF24` |

---

## 4. Theme mechanics

### 4.1 Two orthogonal axes

Mockrill separates *mode* from *skin* so neither fights the other:

| Attribute | Values | Owner | Meaning |
|---|---|---|---|
| `<html data-mode>` | `light` \| `dark` | Mockrill design system | **Colour appearance.** Toggled by the header switch. |
| `<html data-theme>` | `minimal` \| `editorial` \| `operator` | Chassis (`UI-03` / `UI-AC-02`) | **Density & type skin** of the component library. |

The chassis `#theme-select` contract is preserved exactly (same id, same three option values,
same `setTheme()` call flipping `data-theme`). What changes is that the three skins are now
re-expressed *inside* the Mockrill palette instead of shipping three unrelated palettes:

| Skin | Type | Density | Radius |
|---|---|---|---|
| `minimal` *(default)* | Inter UI / Space Grotesk display | `--mk-density: 1` | 12 px |
| `editorial` | +1 step on the scale, 1.65 leading, wider measure | `--mk-density: 1.15` | 14 px |
| `operator` | JetBrains Mono throughout, small-caps labels, tabular nums | `--mk-density: 0.82` | 4 px |

### 4.2 The mode toggle (required cue #2)

* **Placement:** far right of the persistent global header, present on every screen.
* **Form:** a 60 × 30 pill track with a sliding thumb; a sun glyph (rays that rotate and scale
  in) morphs into a crescent moon (a circle mask sliding across) over 420 ms with
  `--mk-ease-spring`. Track `--mk-surface-3`, thumb carries `--mk-shadow-sm`.
* **Accessibility:** a real `<button role="switch" aria-checked>` with
  `aria-label="Switch to dark theme" / "Switch to light theme"`, keyboard focus ring and a
  `title`. Never a bare icon without a name.
* **Persistence:** `localStorage["mockrill:mode"]`. First visit reads
  `matchMedia('(prefers-color-scheme: dark)')`. A blocking inline script in `index.html` stamps
  `data-mode` **before first paint**, so there is no white flash on a dark-mode load.
* **`<meta name="theme-color">`** is updated on toggle so mobile browser chrome follows.

---

## 5. Typography

### 5.1 Families (all variable, all with real fallback stacks)

| Role | Family | Axes | Fallback |
|---|---|---|---|
| **Display** — screen titles, question text, scores | **Space Grotesk** | wght 300–700 | `"Space Grotesk", "Segoe UI", system-ui, sans-serif` |
| **UI / body** — everything else | **Inter** (variable) | wght 400–700, optical sizing | `Inter, system-ui, -apple-system, "Segoe UI", sans-serif` |
| **Data** — timecodes, latency, scores, ids | **JetBrains Mono** | wght 400–700, `tnum` | `"JetBrains Mono", ui-monospace, "Cascadia Mono", Menlo, monospace` |

*Why:* Space Grotesk's slightly mechanical grotesque skeleton reads as "instrument", not
"marketing", and gives Mockrill a display voice Inter alone cannot. Inter is the safest possible
choice for dense UI at 13–15 px. JetBrains Mono was designed for long code sessions and has true
tabular figures — which is what makes a column of `07:42` timecodes align.

**Loading:** self-hosted through Fontsource and imported in `main.tsx`, so the bundle emits its
own subsetted `woff2` files and makes **no external request**. This matters for the demo: a
blocked or slow CDN would have degraded the identity to system fonts in front of a judge. The
fallback stacks stay metrics-tolerant as a second line of defence.

### 5.2 Type scale

Base 16 px, ratio ≈ 1.2 with hand-tuned display steps. Every size ships as a token.

| Token | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `--mk-fs-display` | 44 / 1.05 | 600 | −0.03em | Scorecard overall, hero numerals |
| `--mk-fs-h1` | 30 / 1.15 | 600 | −0.02em | Screen titles |
| `--mk-fs-h2` | 22 / 1.25 | 600 | −0.015em | Current interview question |
| `--mk-fs-h3` | 18 / 1.35 | 600 | −0.01em | Card titles |
| `--mk-fs-body` | 15 / 1.6 | 400 | 0 | Transcript, prose, rationale |
| `--mk-fs-sm` | 13.5 / 1.5 | 400–500 | 0 | Secondary text, buttons |
| `--mk-fs-xs` | 12 / 1.4 | 500 | 0.01em | Meta, helper text |
| `--mk-fs-label` | 11 / 1.2 | 600 | 0.09em, uppercase | Section labels, axis names |
| `--mk-fs-mono` | 12.5 / 1.45 | 500 | 0 | Timecodes, latency, ids |

**Rules**

* Transcript body is the reading surface: 15 / 1.6, measure capped at **68ch**, never justified.
* Every number that changes in place (elapsed timer, latency, scores, filler count) uses
  `font-variant-numeric: tabular-nums` so it does not jitter while ticking.
* Timecodes are *always* mono and *always* rendered as a `TimecodeChip`, never as inline prose.
* Uppercase is reserved for `--mk-fs-label`. No uppercase buttons.
* Question text (`h2`) is the largest element on the live screen — it is what the user has to
  hold in their head while speaking.

---

## 6. Space, radius, elevation, motion

### 6.1 Spacing — 4 px base, `--mk-density` multiplier per skin

`--mk-sp-1: 4px` · `2: 8` · `3: 12` · `4: 16` · `5: 20` · `6: 24` · `8: 32` · `10: 40` ·
`12: 48` · `16: 64` · `20: 80`

Component padding uses `calc(var(--mk-sp-N) * var(--mk-density))` — which is how the `operator`
skin gets genuinely denser without a second stylesheet.

### 6.2 Radius

`--mk-radius-xs: 4px` (chips) · `sm: 8px` (inputs, buttons) · `md: 12px` (cards) ·
`lg: 18px` (panels) · `xl: 26px` (hero surfaces) · `full: 999px` (pills, orb).

### 6.3 Layout

| Container | Width |
|---|---|
| Global header | full bleed, 60 px, sticky, backdrop-blur 12 px |
| App shell content | `min(1120px, 100% − 2 × --mk-sp-6)` centred |
| Reading column (transcript, rationale) | 68ch |
| Live screen | 2-col `minmax(0,1fr) 320px` ≥ 960 px; single column below |
| Scorecard | 2-col `minmax(0,1fr) 340px` ≥ 1024 px |

Breakpoints: `520 / 768 / 960 / 1200`.

### 6.4 Motion tokens

| Token | Value | Use |
|---|---|---|
| `--mk-dur-1` | 120 ms | hover, focus, chip |
| `--mk-dur-2` | 220 ms | enter/exit, screen switch |
| `--mk-dur-3` | 420 ms | mode toggle, panel transition |
| `--mk-dur-4` | 900 ms | meter and score growth |
| `--mk-ease-out` | `cubic-bezier(.16,1,.3,1)` | entrances |
| `--mk-ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | toggle thumb, chip pop |
| `--mk-ease-in-out` | `cubic-bezier(.65,0,.35,1)` | loops |

**`prefers-reduced-motion: reduce` is honoured globally:** loops freeze at a legible resting
frame, transforms collapse to ≤ 80 ms opacity fades, the orb stops breathing but keeps its colour
state, and the working indicator swaps its sweep for a static progress statement. No information
is ever conveyed *only* by motion.

---

## 7. Signature components (and the vector work behind them)

### 7.1 `VoiceOrb` — the state of the call, always on screen

An 8-bar SVG level meter inside a concentric halo, driven by `SessionState`:

| State | Vector behaviour | Halo | Caption |
|---|---|---|---|
| `connecting` | bars collapse toward the baseline; a sweep arc rotates around the ring (1.4 s) | teal, dim | "Opening the line…" |
| `listening` | 8 bars breathe on staggered 0.9–1.5 s loops, teal | teal, pulsing 2.4 s | "Listening" |
| `thinking` | bars flatten; three dots travel along the baseline | violet, slow | "Reading your answer…" |
| `speaking` | bars animate as an outward-travelling wave, violet | violet, strong | "Interviewer speaking" |
| `scoring` | bars re-order into an ascending ramp (a bar chart forming) | amber | "Scoring your answers…" |
| `complete` | bars settle at rest; a check stroke draws in (220 ms `stroke-dasharray`) | none | "Call complete" |
| `failed` | bars drop to baseline, ring turns `--mk-danger` | red, static | "Call interrupted" |

Implemented as inline SVG + CSS keyframes (`transform: scaleY()` on `<rect>` with
`transform-box: fill-box`) — zero JS per frame, zero dependencies.

### 7.2 `WorkingIndicator` — required cue #3

**The rule:** *any* click that does not produce a result within ~400 ms mounts a
`WorkingIndicator` that names the work, in the user's language, with a moving vector.

Composition: a shimmer bar + a **stepped checklist** where each step is
`pending → active → done`, plus an honest sub-caption:

| Trigger | Steps | Sub-caption |
|---|---|---|
| **Start screening call** | `Checking your microphone` → `Opening the AssemblyAI stream` → `Interviewer joining` | "This usually takes about two seconds." |
| **After your final answer** | `Transcribing your last turn` → `Scoring four rubric axes` → `Pulling timestamped evidence` | "Building your scorecard from what you actually said." |
| **Re-drill this answer** | `Re-opening the same session` → `Interviewer re-framing the question` | "The socket stays open — no reconnect." |
| **Test microphone** | single indeterminate bar | "Waiting for your browser's permission prompt." |

Vector: an indeterminate 2 px bar whose gradient sweeps left→right on a 1.1 s loop
(`background-size: 200%` + `background-position` keyframes — GPU-cheap, no layout thrash), plus a
step dot scaling `0.6 → 1` with `--mk-ease-spring` as each step activates.

### 7.3 `TranscriptRail` — the live turn stream

A vertical rail with a 2 px gradient spine. Each turn is a card entering with
`translateY(6px) + opacity 0 → 1` over `--mk-dur-2`, stamped with a `TimecodeChip` and coloured
by speaker (teal left rule = you, violet = interviewer). The in-flight partial renders in
`--mk-text-muted` with a blinking 2 px caret over a soft teal underlay — the visual translation
of `turn_is_formatted`.

### 7.4 `TimecodeChip`

`07:42` in JetBrains Mono 12.5 on `--mk-surface-2`, 4 px radius, with a 6 px teal dot; lifts 1 px
on hover and exposes the millisecond range via `title`. The most repeated atom in the product —
it is what makes the evidence claim tangible.

### 7.5 `EvidenceQuote`

A blockquote card with an amber highlighter wash (`--mk-evidence-soft`) drawn as a background
gradient that **animates its width 0 → 100 % over 500 ms** on mount, like a marker stroke.
Timecode chip top-right, note in `--mk-fs-xs` muted below.

### 7.6 `RubricRadar` + `AxisMeter`

* **Radar:** a hand-built 4-axis SVG polygon (structure / specificity / clarity / relevance,
  0–5 rings). The polygon scales from the centre to its value over `--mk-dur-4`; the drill view
  overlays two polygons (before = dashed muted, after = filled teal).
* **AxisMeter:** the existing `<progress>` element is kept (tests assert on it) and restyled via
  `::-webkit-progress-value` / `::-moz-progress-bar` with an axis-coloured gradient, plus an
  overlaid mono value `4 / 5`.

### 7.7 `ScoreRing`

The overall score as a 120 px SVG ring: `stroke-dasharray` animates 0 → `score/5` over 900 ms
with the numeral counting up in tabular Space Grotesk. Ring hue by band (`< 3` amber, `3–4`
teal-500, `> 4` teal-400 + glow). Never red.

### 7.8 `DegradedBanner`

Keeps its locked `#f59e0b` background (test contract) but is re-composed: amber pill, a moving
barber-pole stripe on the leading edge, a mono reason code, and copy that frames the fallback as
designed behaviour. Sits directly under the header, full bleed.

### 7.9 Backgrounds & textures

1. **Aurora bloom** — two large radial gradients (teal top-left, violet bottom-right) at 3 %
   (light) / 9 % (dark), fixed, `pointer-events:none`, drifting ±16 px on a 24 s loop. Depth
   without a hero image.
2. **Grain** — inline SVG `feTurbulence` fractal noise at ~2.5 % (light) / 4 % (dark) over the
   canvas. Kills gradient banding on dark OLED and gives the booth its material.
3. **Dot grid** — a 24 px radial-gradient lattice at 6 % opacity behind the live screen only; the
   "console" cue, which also gives the empty transcript area something to be.
4. **Header hairline** — a 1 px gradient that brightens teal while a session is live: one ambient
   "we are recording" tell.

---

## 8. Screen-by-screen application

### 8.1 Global shell (all screens)

`AppShell` renders: logo mark + word-mark + live session pill (left) · screen breadcrumb (centre,
mono) · **theme toggle** (right). Sticky, `backdrop-filter: blur(12px)`, background
`color-mix(--mk-bg 82%, transparent)`, bottom hairline. Below it the degraded-banner slot; then a
centred `.mk-main` column.

### 8.2 Setup (`screen-setup`) — the calm on-ramp

* Hero: `h1` "Ready when you are" plus a subtitle naming the call length and that it is voice-only.
* **Role picker** — the native `<select id="role-select">` is *kept* (Playwright drives it) but
  restyled: 44 px tall, `--mk-surface-2`, custom chevron, teal focus ring. A "what you'll be
  asked" preview card sits beside it and cross-fades on change.
* **Pre-flight checklist** — three status rows: microphone (Test microphone → `WorkingIndicator`
  while pending → teal check + "Microphone ready"), voice output (single `role="alert"` when
  absent — exactly one, per the unit test), connection.
* **Interface skin** `#theme-select` restyled inside a "Preferences" row.
* Primary CTA "Start screening call": teal fill, lifts 2 px on hover, 45 % opacity and
  `cursor: not-allowed` until a role is chosen.
* Ambient: an idle `VoiceOrb` breathing slowly — the product's heartbeat before it runs.

### 8.3 Live call (`screen-live`) — the moment that matters

Two columns ≥ 960 px:

* **Left:** the current question in `--mk-fs-h2` inside a violet-edged "interviewer is asking"
  card; the `TranscriptRail` below it; the in-flight partial with its caret.
* **Right (320 px):** `VoiceOrb` + state caption, elapsed timer (mono tabular), latency readout
  with a sparkline of recent `latency_ms` values, and the chassis `StepStatusIndicator` restyled
  as a compact vertical step list.
* A `WorkingIndicator` occupies the transcript area until the first envelope arrives, so the
  screen is never blank between "Start" and the first word.
* Bottom controls: "Back to Setup" (ghost) and "View Scorecard" (teal, pops in when the scorecard
  lands).
* The mic-denied path renders a `--mk-danger` card with the exact reason and a way forward — the
  only red surface in the product.

### 8.4 Scorecard (`screen-scorecard`) — the payoff

* **Summary band:** `ScoreRing` (overall), filler total as a rose chip with top offenders,
  duration, question count. `scorecard-overall` / `scorecard-fillers` keep their text.
* **Per-question cards:** header (question id + mono per-question overall), four `AxisMeter` rows,
  a `RubricRadar` at the right ≥ 1024 px, then the evidence quotes as `EvidenceQuote` cards with
  their timecode chips.
* The **weakest answer** is promoted: amber left rule, a "Focus here" chip, and "Re-drill this
  answer" as the card's primary action (still exactly one such button in the DOM).
* Cards stagger in at 40 ms intervals.

### 8.5 Drill (`screen-drill`) — the loop that closes

* Split layout: left = the original quote (`EvidenceQuote`, amber) + the target chip
  ("Target: Focus on structure"); right = the live re-attempt with a teal caret.
* The before/after `<table>` is preserved (tests assert `table` and `tbody tr`) and restyled: mono
  numerals and a delta column rendered as an arrow chip (green up / muted flat).
* On improvement, one restrained flourish: the delta chips draw in 60 ms apart. No confetti.

### 8.6 History (`screen-history`)

Each `<li>` keeps its exact text content (test contract) but becomes a card with a teal left rule,
mono session id and a hover lift. Empty state: a dotted panel with a resting orb glyph and "No
sessions yet".

### 8.7 Degraded / fallback

Amber banner under the header; the live screen also shows a mono `cached` badge in the rail, so a
judge can see at a glance which rung of the fallback ladder is running.

---

## 9. Recommended component / library stack

**Shipped in this build:** `motion` (Framer Motion v13), `lucide-react`, and the three
Fontsource variable families. Everything else on this list is a **recommendation** for the
post-hackathon build — the identity is complete without it, and each addition below is annotated
with whether it is installed and why.

**Where each mechanism is used, and why the split matters.** A backgrounded tab suspends
`requestAnimationFrame`, so anything whose *resting state* is set by a JS frame loop can freeze
part-way — a toggle stuck mid-travel or a score stuck at 2.4 is worse than no animation at all.
The rule in this codebase:

* **CSS transitions / keyframes** own every state that must *land*: the toggle thumb, the score
  ring (`fill-mode: both`), axis meters, the orb, the working indicator.
* **Motion** owns entrances and layout reflow, where a dropped frame is invisible: transcript
  turns, the question-card swap, the theme glyph.
* Any JS-driven **number** carries a timeout fallback that forces its exact final value.

| Layer | Recommendation | Why here specifically |
|---|---|---|
| **Animation / orchestration** ✅ *installed* | **Framer Motion** (`motion` v13) | `AnimatePresence` + `layout` is the right tool for the `EventEnvelope` stream: each envelope becomes a keyed `motion.li` in the `TranscriptRail`, with `layoutId` carrying a partial turn into its finalised card. Also gives `useReducedMotion()` for free and springs for the toggle thumb. |
| **Headless primitives** — *deferred* | **Radix UI** (`@radix-ui/react-*`) | Accessible Select, Tooltip (timecode ranges), Dialog (mic-permission help), Tabs, Switch — unstyled, WAI-ARIA correct, keyboard complete. Replace the native `<select>` only behind a test-selector migration. |
| **Charts** — *deferred: the hand-built radar and sparkline already match this spec exactly; adding a chart library would add weight and change nothing on screen* | **Recharts** for the latency sparkline and filler-over-time; **visx** (`@visx/shape` Radar) for the rubric radar | Recharts is the fastest path to a responsive line/area chart; visx gives real control over the 4-axis polygon and its enter animation, which Recharts' radar does not. |
| **Audio waveform** — *deferred: needs recorded audio the app does not capture — a feature, not a skin* | **wavesurfer.js v7** + `RegionsPlugin` | Post-call playback with clickable evidence regions — clicking `07:42` seeks the recording. The highest-value addition after the hackathon. |
| **Icons** ✅ *installed* | **Lucide React** | 1.5 px stroke geometry matches the hairline system; tree-shakes; has `mic`, `mic-off`, `audio-waveform`, `sun`, `moon`, `activity`. |
| **Styling** | **Tailwind CSS v4** with our tokens exposed via `@theme`, or **vanilla-extract** if the team prefers typed CSS | Either preserves the `--mk-*` contract; Tailwind v4's native CSS-variable theme maps 1:1 onto `tokens.css` with no rewrite. |
| **Toasts** — *deferred: no surface earns it yet* | **Sonner** | Non-blocking degraded/reconnect notices that never steal focus mid-answer. |
| **Depth / delight (optional)** — *deferred* | **Atropos.js** on the scorecard hero card only | A restrained 3D parallax on *one* surface reads as craft; used anywhere else it reads as a template. Hard cap: one instance, ≤ 6° tilt, disabled under reduced-motion and on touch. |
| **Number transitions** — *deferred: `CountUp` in DataViz.tsx covers this in 20 lines, with the fallback described above* | **`@number-flow/react`** | Correct tabular count-up for scores and filler totals without hand-rolling a RAF loop. |
| **Fonts** ✅ *installed* | **Fontsource** (`@fontsource-variable/inter`, `-space-grotesk`, `-jetbrains-mono`) | Self-hosting removes the Google Fonts network dependency, which matters for the offline-demo fallback rung. |

**Migration note:** every component in §7 has deliberately stable markup — adopting Framer Motion
meant wrapping existing elements in `motion.*`, not restructuring the DOM, so all 29 Playwright
specs survived the change unedited. The same holds for the deferred rows above.

---

## 10. Accessibility contract

* Contrast: body ≥ 4.5:1, large text and UI boundaries ≥ 3:1, in **both** modes.
* Focus: 2 px `--mk-primary` ring + 2 px offset on every interactive element, `:focus-visible`
  only. Never `outline: none` without a replacement.
* Motion: `prefers-reduced-motion` handled globally (§6.4).
* Live regions: session-state changes announce via `aria-live="polite"`; the degraded banner is
  `role="alert"`. The transcript rail is polite, but the *partial* turn is `aria-hidden` so screen
  readers are not spammed word by word.
* Colour is never the sole carrier of meaning — every meter, chip and speaker attribution also
  carries text.
* Targets ≥ 40 × 40 px; the mic and start controls ≥ 44 px.
* Every icon-only control has an `aria-label` and a `title`.

---

## 11. Implementation map

| File | Contains |
|---|---|
| `src/mockrill/ui/styles/tokens.css` | All `--mk-*` tokens, light/dark blocks, skin overrides, chassis `--ui-*` bridge |
| `src/mockrill/ui/styles/base.css` | Reset, typography, backgrounds/textures, focus, reduced-motion |
| `src/mockrill/ui/styles/components.css` | Buttons, cards, chips, selects, tables, meters, rails, banner, shell |
| `src/mockrill/ui/styles/motion.css` | Named keyframes for every animation in §7 |
| `src/mockrill/ui/theme/mode.ts` | `getMode` / `setMode` / `initMode`; localStorage + `prefers-color-scheme`; `theme-color` sync |
| `src/mockrill/ui/components/AppShell.tsx` | Header, logo, breadcrumb, session pill, toggle slot |
| `src/mockrill/ui/components/ThemeToggle.tsx` | The sun ↔ moon switch |
| `src/mockrill/ui/components/VoiceOrb.tsx` | §7.1 |
| `src/mockrill/ui/components/WorkingIndicator.tsx` | §7.2 |
| `src/mockrill/ui/components/TimecodeChip.tsx` | §7.4 |
| `src/mockrill/ui/components/RubricRadar.tsx` | §7.6 |
| `src/mockrill/ui/components/ScoreRing.tsx` | §7.7 |
| `src/mockrill/ui/components/Sparkline.tsx` | latency trend |
| `index.html` | Font links, pre-paint mode script, `theme-color`, grain filter |

### Invariants preserved (do not regress)

`#role-select` and `#theme-select` remain native selects with the same ids and option values ·
button accessible names `Start screening call`, `Test microphone`, `Re-drill this answer`,
`Back to Scorecard`, `History`, `View Scorecard`, `Back to Setup` unchanged and unique ·
`DegradedBanner` keeps the inline `#f59e0b` background · `ScorecardView` keeps exactly four
`<progress>` per question and the `Overall: N` text node · `Drill` keeps its `<blockquote>`,
`Target: …` node and before/after `<table>` · `History` keeps its single-`<li>` text node · all
`data-testid` hooks and the `window.__mockrill` probe are untouched.

---

## 12. QA checklist

- [ ] Toggle mode on every screen — no flash, no unstyled frame, persisted across reload.
- [ ] `prefers-color-scheme: dark` respected on a fresh profile with no stored preference.
- [ ] `prefers-reduced-motion: reduce` — loops at rest, no transforms, all information legible.
- [ ] All three chassis skins render correctly in both modes.
- [ ] 320 / 768 / 1440 px viewports — no horizontal scroll, no clipped timecodes.
- [ ] Degraded rungs 2 and 4 render the amber banner and stay readable.
- [ ] `npm run typecheck && npm run test:mockrill && npm run test:e2e` all green.
- [ ] No network request leaves the page for fonts (DevTools → Network, filter `font`).
- [ ] Backgrounded-tab check: switch tabs mid-scorecard, return — the ring, the toggle and every
      number are at their final state, never frozen part-way.

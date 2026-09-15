# Handoff — Sherlock navigator work (Anviq-Home)

Branch: `debugging-pass`. Everything below is **uncommitted, not merged, not deployed**. Do not merge into prod until the owner (Enrique) says so.

This doc exists so a fresh agent (or human) can pick up mid-stream without re-deriving five prompts' worth of context. Read this fully before touching anything.

## What this is

Anviq-Home is the live marketing site for Anviq (anviq.net), an independent IT/AI consulting practice. React 19 + TS + Vite + Tailwind 4 + React Router, Cloudflare Pages. Finder/iOS-Files filesystem metaphor: desktop = macOS-style sidebar+pane board, mobile = iOS Files grid + tab bar.

The multi-prompt engagement built a **"Sherlock" navigator**: a deterministic (NO AI, NO LLM calls) way to browse the real site via a desktop terminal or a mobile chat sheet, both driven by one shared data model, with a locked-copy personality layer ("Sherlock, finder of things") reacting to real navigation events.

**Hard rule that shaped everything**: nothing in the navigator may invent site content. Every string is either extracted verbatim from a real page, or a fixed "tone map" line the owner reviews explicitly (`src/lib/tone.ts`).

## Architecture (read in this order)

1. **`src/lib/siteTree.ts`** — single source of truth for the site's navigable structure. `SiteNode` = `{ path, name, kind: "folder"|"file"|"link", route?, href?, summary, aliases?, children? }`. 17 nodes total: 16 owner-verified routes + `/explore/browse` (a real route, flagged as outside the owner's original 16-item inventory, kept per the grounding rule: "flag it, don't hide it") + a synthetic `/contact` folder holding 4 real external links (Calendly/LinkedIn/X/email) that has no `route` of its own.
   - Helpers: `resolvePath(cwd, input)`, `listDir(path)`, `findNode(path)`, `flattenRoutes()`.
   - `scripts/audit-site-tree.mjs` (`npm run audit:site-tree`) — loads the tree via Vite's SSR module loader, parses `Home.tsx`'s actual `switch(active)` + `SLUGS`, diffs them. Currently 17/17 exact match.

2. **`src/lib/terminalCommands.ts`** — pure function `runCommand(cwd, input) -> { lines, cwd, action?, clear? }`. Desktop terminal's command dispatch: `help ls cd pwd cat open clear` + aliases `dir/type/cls/start`. `open` on a link node returns `{type:"external", href}`; on a page node returns `{type:"navigate", route}`.

3. **`src/lib/chatIntents.ts`** — `matchIntent(query)`: deterministic keyword table built automatically from every node's path segment/aliases/name words (no hand-authored list to drift). First matching word in the query wins — no NLP, no scoring, on purpose.

4. **`src/lib/guide.ts`** — the deterministic hint/personality engine, `useGuide(isOpen)`. This is the most fragile file; read its own header comment before editing. Key things a future editor MUST know:
   - **A hint's one-time flag is committed only on `dismiss()`/`close()`, never as a side effect of rendering.** An earlier version committed inside a render-reactive `useEffect` and a real bug resulted: opening the panel and computing the hint happen in the same React batch, so the commit effect fired in the same tick and cleared the hint before a human could see it painted. Confirmed via live console tracing, not guessed. Do not revert to that pattern.
   - Visited-tracking is a plain `useEffect` reading `visited` from closure, **not** a functional `setState` updater — an earlier version queued side effects inside `setVisited(prev => ...)`, which is impure and was flaky under StrictMode's dev-mode double-invocation of updater functions. Also a real, confirmed bug.
   - Global cross-component signals (emoji click, booking click, print event, tab-return, etc.) go through one mutable `state` bundle + one `EventTarget` bus + `useSyncExternalStore`, not prop drilling. `queueEvent(id, text)` is the single-slot queue all of R-d/R-e/R-m route through.
   - Priority order in `currentHint()`: pendingCommentary (R-s) > pendingEvent (R-d/R-e/R-m) > unmatched-input (rule e) > idle (rule d) > booking (rule c) > social (rule f) > R-g (emoji loop) > evergreen core progression (rules a/b).
   - Rule g's exact "after the very first hint ever" sequencing and the cross-visit joke-queue-carry (spec's 2-joke-per-visit cap) are **simplified**, not fully built — flagged in the file header, not silently faked.

5. **`src/lib/tone.ts`** — every locked, owner-reviewable string. Nothing computed, nothing paraphrased. **The owner has not yet done the line-by-line review the original spec asked for** (tone map generally, R-d trio specifically flagged "highest overcook risk," email-copy line specifically flagged "OWNER SIGN-OFF REQUIRED"). `EMAIL_COPY_ENABLED = false` in `guide.ts` keeps that one reaction wired but inert until flipped.

6. **`src/lib/motion.ts`** — single source for navigator/board transition timing (`FADE`, `SPRING_MORPH`, `BOARD_ENTER`, `BOARD_EXIT`, `motionOr()`). Explicitly does **not** touch `PALETTE_FADE` in `Home.tsx` (the desktop `CommandPalette`'s own fade) — that's a scope guard from the spec ("any diff touching desktop search/command-palette files = automatic fail") and has been re-verified via `git diff` grep every pass since.

7. **`src/components/SiteNavigator.tsx`** — the single dispatcher: one `matchMedia("(min-width: 1024px)")` check, renders `<Terminal/>` or `<MobileChat/>`, never both. This used to be two independent conditions spread across `Home.tsx` and there was a real ~155px gap (1024-1179px) where *neither* rendered — fixed by consolidating to one ternary on one boolean. If you ever see the terminal/chat trigger missing at some viewport width, check this first.

8. **`src/components/Terminal.tsx`** / **`src/components/MobileChat.tsx`** — the two presentation layers. Both call the *same* `useGuide()`, `runCommand`/`matchIntent` respectively. MobileChat's bottom sheet uses real Framer `dragControls` physics (1:1 tracking, velocity+distance-based commit/abort, no upward rubber-band) — see A1 below.

## What's been verified (not just "should work")

- `npm run audit:site-tree` — 17/17 route parity, passes.
- `npm run verify:navigation` — every real node opens its real destination through **both** surfaces' actual dispatch code (not mocked), passes.
- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` — all clean as of the last edit.
- Live-verified in-browser (screenshots, not just code review): R-0 greeting exact text once, R-n node-opener lines, R-s section commentary firing from *passive* router navigation (no navigator open), R-m emoji milestone ("First 🥰 logged...") firing with correct priority, external link open (`open contact/calendly` → real Calendly tab, no reload of the main tab), terminal aliases, badge-when-closed-else-banner-when-open behavior, drag-to-dismiss distance threshold.
- Two real bugs were found via this live testing (not by inspection) and are described above in the guide.ts section — both fixed and re-verified.

## What's still open / needs a human decision

1. **Workstream B (geo-copy pass)** is *partially* done:
   - ✅ Rewrote the Constraints "US clients" line to frame GDPR/EU AI Act as the practice's own stricter internal bar applied to every client, not an EU-only default with US bolted on.
   - ✅ Removed the "DACH" section/branding from Constraints entirely per owner instruction — renamed to "In practice" (`DELIVERY_PROOF` in `src/data/content.ts`, was `DACH`), dropped the "German-native delivery / DACH market" bullet (a market-identity claim, not a compliance proof point — the 3 remaining bullets, UWG §7/Data residency/AI Act, stayed since they're real compliance-rigor proof tied to actual project work).
   - ⚠️ **Not done, flagged to the owner, no answer yet**: the founder bio line in `Home.tsx` (`FOUNDER_LINE` constant, ~line 116) still says "Native German speaker, DACH market" — same market-identity pattern that was just removed from Constraints. Owner was told; no decision recorded.
   - The rest of Workstream B (icon optics A5, sizes A6) folded into Workstream A below since they were small.

2. **Workstream A (iOS-feel micro-behavior) is fully done** — A1 (real sheet drag physics), A1b (mobile search capsule, desktop untouched), A2 (pressed states across chips/pills/rows/links), A3 (physical-pixel hairlines + real vibrancy on the chat sheet and both trigger pills, which were flat opaque before), A4 (motion.ts consolidation), A5 (icon optics checked, no fix needed — note: the spec said "four" tab bar icons, there are actually only three: Overview/Browse/Activity), A6 (one real 44px-minimum offender found and fixed, `.chat-open-button`).

3. **No custom Sherlock mark shipped.** A hand-authored SVG attempt (deerstalker-on-folder) read as a turtle, not a hat — owner explicitly chose "ship without a custom mark for now" over further iteration. Trigger buttons use plain Lucide icons (`SquareTerminal` for desktop, `Compass` for mobile). If asked to revisit this, don't hand-author SVG coordinates blindly again — use an actual image-generation skill/tool with visual iteration, or get a real asset from the owner.

4. **DEFINITION OF DONE items not literally produced**: the original spec asked for video recordings (slow-drag-abort, fast-flick-dismiss, slow-mo press-state footage) and side-by-side reference-image crops. None of that is possible without a real video-recording tool or a supplied reference image — substituted with multi-frame screenshots and live console/DOM verification instead, called out explicitly each time rather than silently skipped.

## Ground rules that must not be relaxed

- No invented copy anywhere in the navigator. If a string isn't extracted from a real page or in `tone.ts`, it doesn't ship.
- Desktop `CommandPalette` / `PALETTE_FADE` / the base `.search-field` and `.command-palette-dialog` CSS are walled off. Verify with `git diff -- src/pages/Home.tsx | grep CommandPalette` before any CSS/motion pass — should always come back empty for this work.
- Commit messages: no AI/Claude co-author trailers, ever (this is a standing rule for this repo/owner, not specific to this feature).
- Ponytail-lazy default: smallest correct diff, reuse existing patterns/tokens before inventing new ones, no speculative abstraction.
- Before claiming something works, verify it live (browser console + screenshots) rather than trusting that the code "should" work — this session found two real, non-obvious bugs exactly this way.

## Quick orientation commands

```
npm run dev                  # dev server, currently expected on :5173
npm run audit:site-tree      # route-parity check
npm run verify:navigation    # both-surfaces destination check
npx tsc -b --noEmit && npm run build && npm run lint
```

---

## Prompt 7 v3 (2026-09-14) — terminal polish + badge system

Continuation of the Sherlock navigator. Uncommitted. Do not merge until Enrique says so.

### Handoff reconciliation (this pass vs the previous handoff)

**Confirmed-real (did not rebuild):** siteTree 17/17 audit, `runCommand` / `matchIntent` dispatch, `useGuide` commit-on-close (not on render), R-0 / R-n / R-s / idle timer / multi-day IIFE, SiteNavigator 1024px ternary, CommandPalette visual wall-off (`PALETTE_FADE` untouched).

**Claimed-but-missing (handoff said landed; live code disagreed):**
- `open` / `cd` by the names `ls` prints. Resolver only walked path segments + aliases, not display names, and did not fall back globally. `cd Selected work` and `open Steadyward` from `/` failed. That is the owner "ls shows names, they don't resolve / open opens nothing" bug. Fixed in `siteTree.resolvePath` (name/normalized match + unique global fallback).
- `markOnce` never wrote `anviq-guide-once` to localStorage. Greetings, badges, and once-flags reset on every full load. Fixed: persist visitor flags; keep `*-this-session` in memory.
- Terminal body was not black. Handoff described glass chrome. Measured cause: `.terminal-window` `color-mix(var(--surface) 82%, transparent)` + `backdrop-filter: blur(24px) saturate(1.8)` over the light page. Opaque `#0b0b0d`, blur removed on the window only.

**Parked-for-owner (unchanged):** FOUNDER_LINE still says "Native German speaker, DACH market"; no custom Sherlock mark; no video DoD (no recorder). Sheet/pill still use the same blur+translucent chrome as the old terminal — flagged, not expanded.

### What landed

- **A-0:** `cd Selected work` -> `/projects`; `ls` marks folders with `/`; four project files have no slash; `open <name>` from root performs real `navigate()`. `npm run verify:navigation` 20/20 green including name-open.
- **A-1:** `src/lib/suggest.ts` is the shared matcher (terminal ghost, slash overlay, mobile chips, capsule/palette `queryWordsMatch`). Ghost: `op` -> `open steadyward`, Right-arrow accepts, Tab cycles, >3 dim row. `/` overlay on empty-first-char. Global `/` focuses the open terminal instead of the palette. Capsule live-filter + Sherlock rescue once per session (StrictMode-safe; do not put `consume()` inside `state ?? consume()`).
- **A-2:** Live `data-guide-status` in the titlebar (observed `1 visited` -> `2 visited` without reopen). Idle 20s line in the transcript. Multi-day return by editing `anviq-guide-last-visit-ms`. Persona hints inject into the transcript then `dismiss()` so they do not block idle.
- **A-3:** Locked `COMMAND_COMMENTARY` in `tone.ts`. Rendered as `›` Sherlock lines on the triggering command. Two-joke cap; over-cap lines are not marked seen (so they can fire next visit on a new trigger). `exit` does not close; Esc does. `sudo` captured verbatim.
- **A-4:** `.terminal-window` background `rgb(11, 11, 13)` (`#0b0b0d`, delta 0), `backdrop-filter: none`. Dim `#a1a1a6` 7.64:1, ghost `#6e6e73` 3.88:1. FLAG: `.chat-sheet` / trigger pills still use blur glass.
- **B:** Derived badge count = unmet Sherlock + current non-evergreen/non-idle hint. No imperative count. iOS red numeral, squircle if supported, <300ms pop once, reduced-motion skips pop. Accessible name `Sherlock, 1 pending suggestion: you haven't met yet`. First badged open prepends duration-derived greeting (0 days -> "today") before R-0.

### Verification evidence

- `npm run audit:site-tree` 17/17.
- `npm run verify:navigation` 20 nodes + `cd Selected work` + folder marker + four files + `op` ghost.
- `npx tsc -b --noEmit` clean.
- Headless Chromium (`scripts/verify-prompt7-browser.mjs`) **30/30 PASS** against `:5174`, including URL change `http://localhost:5174/` -> `/projects/steadyward`, computed style, contrast numbers, slash overlay, idle string, capsule rescue, all locked command lines, multi-day variant.
- Screenshot: `scripts/prompt7-evidence/terminal-black.png`. Adjacent-OS-window crop not taken (headless). Numeric readout stands in.

### Continuation (same day)

Closed remaining Prompt 7 gaps that the first 30-check run skipped:

- Tab now freezes the suggestion list for the typed prefix. First Tab accepts the ghost (`op` -> `open steadyward`); further Tabs cycle (`open lv-matching`, ...). Typing resets the list.
- Empty input no longer paints the dim completion row (was flooding `ls projects · cd contact · ...`).
- Badge count is unmet + `pendingCommentary` + `pendingEvent` only. Ambient evergreen / R-g / idle were re-inflating the badge after first open (HARD FENCE fail).
- Extended headless run **42/42 PASS**, including Tab cycle, capsule `crm` live-narrow, history next session (`cd S` -> `cd Selected work`), fresh mobile badge `1`, reduced-motion (no pop class), pending-hint cycle (services visit -> badge `1` with commentary aria -> open clears).

### Open issues

- Adjacent-window photograph still missing.
- Joke cap of 2 means badge-greeting + sudo in one visit will suppress later command commentary until reload (cap resets, once-flags persist). By design.
- `book` / `email` / `follow` / `hug` / `search` slash verbs are not present; overlay lists real commands only.
- Workstream B FOUNDER_LINE DACH still waiting on owner.

### Decisions

- Global name fallback on `resolvePath` so `open` matches what `ls` printed from any cwd.
- Truth-option badge greeting (derived days), not a fabricated four days.
- Inject-then-commit for open-surface persona hints, so idle is not blocked and the old same-tick-clear bug does not return.
- Terminal black is opaque; do not put blur back on `.terminal-window`.

### Traps

- `markOnce` must persist, except `*-this-session`.
- Never commit a hint as a side effect of merely computing it. Copy into the transcript first.
- `setState(c => c ?? consume())` plus StrictMode double-effects will consume then return null. Keep the rescue string in React state without a one-shot consume inside the updater.
- CommandPalette `/` must yield when the navigator surface is open.
- Do not touch `.command-palette-dialog` / `PALETTE_FADE` CSS.

## Prompt 7 debug (2026-09-14)

- **Provenance:** this checkout contains v3 A-0 (recorded above as `cd Selected work`, folder markers, and name-open) and A-4 black-terminal work. It contains no A-5 corner band or v4 typing rule, so typing and corners were unimplemented new work; navigation is a regression claim against A-0.
- **Navigation cause:** `Terminal.submit` called the shared resolver and React Router correctly for `open`, but v3's `cd` result carried only a changed terminal cwd and no router action. Folder `cd` now returns its real route as the same `navigate` action consumed by `Terminal.submit`; `cd steadyward` still correctly refuses the `file`, and `open steadyward` routes it. Regression checks: `scripts/verify-terminal-owner-repro.mjs`, `scripts/verify-navigation.mjs`.
- **Typing cause:** v3 rendered all transcript text as static `<p>` content. `src/components/TypedPersonaLine.tsx` now types persona/tone text at 75 chars/sec, completes on key/pointer input, honors reduced motion, and sends one complete polite screen-reader announcement. Facts and command output remain static.
- **Corners cause:** `.terminal-window` inherited `--radius-window` (16px). It now consumes `--radius-terminal-window: 9px`; only the outer chrome clips, the terminal body has no nested radius. The existing `@supports (corner-shape: squircle)` remains in place. Finder board remains 16px via `--radius-window`.
- **Verification trap:** managed Chromium startup currently fails before page load when it cannot create its Crashpad/profile files; the regression script creates an isolated temporary profile, but a live clip/screenshot still needs a browser environment that permits Chromium startup. Do not claim a video artifact until that runner is available.

## Prompt 8 v2 (2026-09-14)

- **A cause/fix:** mobile Sherlock was a fixed `45vh` modal sheet with a dimming backdrop. It is now one `MobileChat` state machine: persistent ask-bar pill -> content-fitted `45svh`-capped card -> pill. The card has no scrim, sits above the tab bar/safe area, and keeps the existing lightbox-close listener.
- **B provenance/root cause:** Prompt 8's `{e}` model was absent. v3 had legacy `anviq-guide-emoji-count`, one `emojiCount` state field, and hardcoded 🥰 strings/display. `anviq-guide-emojis-v2` now stores `{ active, counts }`; the old key migrates to the default emoji then is removed. All footer clicks call `countEmoji(name)`.
- **Regression check:** `scripts/verify-emoji-forensics.mjs` verifies migration, independent A/B counts, active restoration, and template-only tone strings.

## Follow-up (2026-09-14)

- **Engagement:** replaced the plain document stack with a single three-stage path panel: numbered Assessment, Build, and Retain rows, with Build given the quiet active treatment. It keeps the existing Finder-pane spacing, dividers, typography, and one contact action; no tabs, icons, prices, or in/out checklist returned.
- **Emoji counter retired:** removed the footer count, active-selection ring, local per-emoji store, milestone/tone copy, global reaction request, and `scripts/verify-emoji-forensics.mjs`. `guide.ts` removes the retired `anviq-guide-emoji-count` and `anviq-guide-emojis-v2` keys on load. The footer control is now only a local reaction gesture.
- **Validation:** `npm.cmd run build` passes. `npm.cmd run lint` reports its existing five warnings and no errors. Local `/` and `/explore/engagement` return HTTP 200.

## Interaction pass (2026-09-14)

- **Engagement:** a compact three-stage segmented control now swaps a single scoped detail panel. It exposes the selected stage's description, included work, and outcome without prices, icons, or the previous generic card stack.
- **Approach:** delivery steps are selectable controls with an active rail and direct keyboard focus, replacing scroll-driven focus that was not discoverable as an interaction.
- **Constraints:** concise boundaries now use a Finder-style list-and-inspector layout; selection changes the adjacent explanation instead of rendering four long sections.
- **FAQ:** replaced passive native disclosure styling with a one-open-at-a-time, keyboard-accessible question list and explicit expanded state.
- **Validation:** `npm.cmd run build` passes; `npm.cmd run lint` has the same five pre-existing warnings and no errors; `/explore/engagement`, `/explore/approach`, `/explore/constraints`, and `/explore/questions` each return HTTP 200 locally.

## Finder-conformity correction (2026-09-14)

- The interaction pass initially used generic segmented controls and bespoke card states. Replaced those with the explorer's actual established primitives: Engagement is now a selected stage list next to a document preview; Approach, Constraints, and FAQ use the same flat selected-row, thin-divider, and document-preview materials while retaining their distinct interaction models.
- Read the Apple Design skill and the existing `DESIGN.md`; the relevant priority is the established Finder system over generic platform-looking widgets.
- **Validation:** `npm.cmd run build` passes; `npm.cmd run lint` has five existing warnings and no errors; the four interactive document routes return HTTP 200 locally.

## Differentiation pass (2026-09-14)

Owner ("Enrique") was unhappy that Engagement and Constraints read as the same component (numbered picker list + adjacent detail panel, identical CSS grammar) once the Finder-conformity correction landed, and that Approach used a near-identical numbered-row list. Asked for four genuinely distinct, still-interactive treatments via the Apple Design skill.

- **Approach:** was a flat numbered list with an always-visible body per row (visually the same silhouette as Constraints' picker). Now a real connected timeline — beads joined by a vertical connector line, one step expands/collapses in place on click (`AnimatePresence` height animation), others collapse to a title-only row. `process-list`/`step-number` CSS replaced by `process-timeline`/`step-bead`.
- **Engagement:** was the identical list+detail split as Constraints (`engagement-file-list` + `engagement-preview`). Replaced with a horizontal segmented control (reusing the same pill/sliding-selection grammar as `FilesNavigation`'s `.files-view-switch`) over a full-width spec panel. This also surfaces `ENGAGEMENT[].price`, `.out`, and `.note`, which existed in `content.ts` but were never rendered before — real content, nothing invented.
- **Constraints:** left untouched (list + inspector); it's now distinct on its own since Engagement no longer shares its shape.
- **Questions:** left untouched (accordion); already distinct.
- Net result: four different silhouettes — timeline, segmented spec sheet, list+inspector, accordion — same design tokens/typography throughout.
- **Validation:** `npx tsc -b --noEmit` clean, `npm run build` clean, `npm run lint` same five pre-existing warnings, all four `/explore/*` routes HTTP 200. Live-verified in-browser: Approach step expand/collapse, Engagement tab switch (price badge + included/not-included + closing line changing per stage), Constraints and Questions unchanged.

## Polish pass (2026-09-14, later same day)

Owner feedback after the differentiation pass: "Constraints still sucks", Engagement had too many line dividers, Questions wasn't optimal either. Direction was right, craft wasn't there. Re-read the Apple Design skill and fixed each concretely rather than re-shuffling layout again.

- **Constraints:** the picker/detail split read as plain text in boxes. Added a semantic Lucide icon per boundary (`FileCheck2` Ownership, `Lock` Access and data, `Scale` Decision boundaries, `EyeOff` Discretion — decorative UI chrome, not new copy) in a tinted rounded-square tile, System-Settings-pane style. The picker sits on a `--sidebar`-tinted panel, the whole inspector is now one rounded card (`border-radius:12px; overflow:hidden`) instead of plain top/bottom hairlines, and the detail pane leads with a large matching icon tile instead of just a small caption.
- **Engagement:** cut every `border-top` divider out of the included/not-included lists and the outcome line (previously 6+ horizontal rules on one screen). Included/excluded items now carry a `Check`/`Minus` icon instead of a line under each row (meaning by icon shape, not color alone). The closing "next" line is now a single tinted callout card instead of a bordered strip.
- **Questions:** replaced the instant show/hide with a real `AnimatePresence` height animation (same pattern as Approach's timeline). Dropped the full-row `--selected` background fill on the open question — that same "solid blue selected row" treatment was already used by Constraints' picker, Approach's timeline and Engagement's old list, so reusing it here made every page feel like the same component. Open question is now just accent-colored text + a rotated, accent-colored chevron.
- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` (same five pre-existing warnings) all clean. Live-verified in-browser: Constraints icon-tile swap per boundary, Engagement icon list + callout, Questions smooth open/close animation, all three still keyboard/aria operable (`aria-pressed`, `aria-expanded`/`aria-controls` unchanged).

## Second polish pass (2026-09-14, same day)

Owner: direction is right, but "not interactive enough", the Free/Fixed price/Month to month badges "look vibe coded", and Questions still had too many divider lines.

- **Price badges removed.** `engagement-price` was a colored pill (`background: var(--selected)`) next to the stage title — a generic "badge" look the owner explicitly called out. Replaced with plain secondary text (`color: var(--muted)`, no background) preceded by a small CSS bullet dot, matching how a document/inspector shows a secondary attribute next to a title rather than a slapped-on chip.
- **Real keyboard interaction, not just click.** Added a shared `focusSiblingButton()` roving-focus helper (`src/pages/Home.tsx`) and wired arrow keys into all four interactive explore pages: Engagement's segmented tablist (Left/Right, auto-activates per the standard tabs pattern), Constraints' picker (Up/Down/Left/Right, auto-activates), Approach's timeline (Up/Down, auto-activates/expands), and Questions' accordion (Up/Down moves focus only — Enter/Space opens, per the ARIA accordion pattern, not auto-activation). This is genuine standards-based interactivity, not a cosmetic add.
- **Questions dividers cut further.** Was one hairline per question plus a closing hairline (5 lines for 4 items). Now a single top hairline framing the whole list; individual questions are separated by spacing only, with the open answer distinguished by accent-colored text/chevron, not a line or fill.
- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` all clean (same five pre-existing warnings). Live-verified in-browser via `document.activeElement` checks: arrow-key nav confirmed working and auto-activating on Engagement (Assessment → Retain) and Constraints (Ownership → Decision boundaries), and confirmed focus-only (no auto-open) on Questions with Enter opening the focused item. Price text confirmed as plain "Retain · Month to month" with no pill background.

## Third polish pass (2026-09-15)

Owner: "that large text doesn't match either" — the Engagement stage's closing line ("You get the plan and decide whether to move to Build.") was still a tinted blue callout box with bold colored text, same generic-badge problem as the price pill, just moved one element down.

- Removed the `--selected` background box and bold blue text entirely. It's now a `document-label` caption ("Outcome") followed by a plain bold statement in normal text color, at document body scale — the same label-then-content pattern already used for Included/Not included, so it reads as one more field in the spec sheet instead of a separate highlighted component.
- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean (same five pre-existing warnings). Live-verified in-browser.

## Fourth polish pass (2026-09-15)

Owner: "the generic blue everywhere on these pages doesn't even match the blue on selected work."

Root cause: the sitewide selection language (sidebar `.nav-link.is-selected`, `.project-row.is-selected`) has always used the pale `--selected` / `--selected-text` pair (`#dceaff` / `#004aab`), reserving the saturated `--accent` (`#0065db`) only for links and primary buttons ("restrained action blue" per `DESIGN.md`). The differentiation passes on Constraints and Approach introduced solid `--accent`-filled badges (the constraint icon tile, the timeline bead) and the Questions rewrite colored the open question's text/chevron with `--accent` too — all outside the established pattern, so they read as a different, more saturated blue than the rest of the app (including the folder artwork/selection state on Selected work).

- `.constraint-picker button.is-active .constraint-icon`: `background`/`color` changed from solid `--accent`/`--surface` to `--selected`/`--selected-text`.
- `.process-timeline li.is-active .step-bead`: same swap, `background`/`color`/`border-color` now `--selected`/`--selected-text`/`--selected-text`.
- `.faq-list > section.is-open button` (text) and its `svg` (chevron): `--accent` → `--selected-text`.
- Left `.engagement-terms` Check-icon color on `--accent` alone (a small inline glyph, not a filled badge — matches the existing sitewide pattern of accent-colored icons next to links, e.g. `.internal-link svg`).
- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean (same five pre-existing warnings). Live-verified in-browser: Constraints icon tile, Approach bead, and Questions open state all now render in the same pale-blue/navy pair as the sidebar's selected nav item.

## Fifth polish pass (2026-09-15)

Owner: Approach was the last page still reading as "ugly blue," and the step numerals "don't look very apple like." Separately: the Engagement price text ("Free"/"Fixed price"/"Month to month") next to the stage title "still doesn't fit in" even after dropping the pill.

- **Approach gone fully monochrome.** The prior pass had already swapped the bead's active fill from solid `--accent` to pale `--selected`/`--selected-text` (matching the sidebar), but a full-row `--selected` background wash on the active step compounded with the tinted bead read as "a lot of blue" concentrated in one place. Removed the row wash and the `h2` color change entirely; the only "active" cue now is the bead itself, which fills solid `var(--text)` (ink, not blue) with a `var(--surface)` numeral — the same monochrome "current step" language Apple setup/settings UIs use, no color at all.
- **Numerals de-monospaced.** `step-bead` was rendering the zero-padded string `"01"`/`"02"` in `font-variant-numeric: tabular-nums` at 12px — reads like a code/CLI index, not an Apple numbered-step glyph. Now renders `Number(step.n)` (`1`, `2`, `3`, `4`) in the site's regular system sans at 13px, no monospace, no zero-padding (display-only change; `PROCESS[].n` in `content.ts` is untouched, still used as the state key).
- **Engagement price moved, not just restyled.** Sitting inline next to the `h2` at 17px next to a 21px heading kept reading as a mismatched second label no matter the color. Moved it to sit *above* the title as a `document-label` caption — the exact same caption-above-heading structure Constraints already uses for "Operating boundary" above its `h2`, and the same `.document-label` class already used on this very page for "Included"/"Not included"/"Outcome." It's no longer a bespoke element, just another instance of the page's own established label pattern.
- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean (same five pre-existing warnings). Browser-based live verification was interrupted mid-session (Claude in Chrome extension disconnected) — changes are otherwise the same CSS/JSX pattern already confirmed working on Constraints/Questions in the prior pass; re-verify visually next session before considering this fully closed.

## Prompt 9 v2 (2026-09-15) — mobile assistant rest-state correction + active edge state

One surface (`MobileChat.tsx` + its CSS in `index.css`), one pass. Badges, emoji logic, tone map, terminal, desktop, dispatcher: confirmed untouched (see regression evidence below).

### R — rest-state correction

- **R-1 shape:** `.chat-trigger` was a compact icon+label pill anchored to the bottom-right corner (`right: ...` only, no `left`). Rebuilt as a full-width capsule text-field: `left`/`right: max(18px, safe-area)`, same side rhythm as `.files-tab-bar`. No bubble/speech-tail silhouette — it's the same `border-radius: var(--radius-pill)` + squircle-eligible (`@supports (corner-shape: squircle)`) treatment used elsewhere.
- **R-2 material:** fill recipe copied verbatim from the mobile search capsule (`.search-field-wrap .search-field`) — `color-mix(in srgb, var(--muted) 12%/10%, ...)` with the same `blur(8px) saturate(1.4)` and reduced-transparency fallback — plus a `1px solid var(--line)` hairline the search capsule doesn't have (spec calls for one here specifically). `box-shadow: none` at rest, confirmed by computed-style check (see verify script).
- **R-3 placement:** bottom offset recomputed from the tab bar's own geometry instead of an arbitrary number: tab bar is 64px tall (5px padding + 54px row + 5px) sitting `max(12px, safe)` off the screen bottom, so the capsule sits `max(88px, safe + 76px)` off the bottom — i.e. directly above the tab bar with the same 12px rhythm gap the tab bar itself uses from the true edge.
- **R-3b active edge state (new in v2):** `.chat-edge-tint`, a `position: fixed; inset: 0` layer with `pointer-events: none` and an *inset* `box-shadow` ring (`2.5px`, `color-mix(var(--accent) 22%, transparent)`) — not a border, so it adds no layout. Mounted/unmounted in the same `AnimatePresence` as the card, `key="edge-tint"` as a sibling of `key="card"` (framer-motion's standard multi-child pattern, not a Fragment). Fades via `motionOr(reducedMotion, FADE)` — `FADE` is 180ms, under the 200ms cap, reduced-motion collapses it to instant per the existing `motionOr` convention (no new keyframes, no new motion.ts export). `z-index: 25`, below the trigger (40), the tab bar (30), and the card (200) — no interactive chrome sits at the literal screen edge, so it can't paint over a focus ring.
- **R-4 content:** leading mark is `<Compass size={24}>` inside a new `.chat-trigger-mark` wrapper (24px, `position: relative`) so `SherlockBadge` anchors on the mark itself, not the whole capsule's corner. Placeholder text is `"Ask Sherlock…"` in a `.chat-trigger-placeholder` span, `color: var(--muted)`, no secondary text or avatar block. **Flag, not silently faked:** the spec's "deerstalker mini-mark" doesn't exist as a shipped asset — HANDOFF's Prompt-7-era decision was explicit that no custom Sherlock mark should be hand-authored blindly again. Kept the existing Lucide `Compass` glyph rather than drawing a new SVG; a real mark still needs an actual image-generation pass or an owner-supplied asset.
- **R-5 state machine:** found and fixed a real bug, not just cosmetics — the trigger capsule was never actually hidden while the card was open; it sat visually below the card (its own `bottom` offset lower than the card's), so both an "input" (capsule) and the card's own input coexisted, contradicting Prompt 8's own "capsule → card → capsule" model. Now `aria-hidden`/`tabIndex={-1}` toggle with the `open` state, paired with `.chat-trigger[aria-hidden="true"] { opacity: 0; pointer-events: none; }`. The DOM node is never unmounted (only hidden), so `triggerRef` stays valid and the existing focus-return-to-trigger-on-close behavior is untouched and still verified working.
- **R-6 motion:** everything routes through `motion.ts` (`FADE`, `motionOr`) — no new keyframes, no new motion.ts export needed for this pass.

### Verify

- New script: `scripts/verify-prompt9-mobile-chat.mjs` (same puppeteer-core-against-cached-Chromium pattern as `verify-prompt7-browser.mjs`) — **16/16 PASS**: rest capsule `box-shadow: none`, ≥44px tall, placeholder text present, side margins within 2px of the tab bar's 18px; trigger `aria-hidden`/opacity/pointer-events all correctly flip on open; exactly one `.chat-sheet` in the DOM while open; edge tint present with an inset box-shadow ring, `pointer-events: none`, settled opacity 1; on close, trigger reappears, focus returns to it (`document.activeElement` is the trigger), tint and card both removed from the DOM.
- Screenshots: `scripts/prompt9-evidence/rest.png` (390px viewport, capsule flush above tab bar, badge on the leading mark) and `active.png` (card open, capsule fully gone — not stacked underneath).
- Regression: `npm run audit:site-tree` 17/17, `npm run verify:navigation` 20/20 green, `npx tsc -b --noEmit` / `npm run build` / `npm run lint` all clean (same five pre-existing warnings, no new ones). Touched files this pass: `src/components/MobileChat.tsx`, `src/index.css`, `scripts/verify-prompt9-mobile-chat.mjs` (new), `scripts/prompt9-evidence/` (new, screenshots + throwaway capture script). Nothing else.
- Not captured: a real device/browser recording (side-by-side crop of the two capsules, activate/dismiss clip) — Claude in Chrome disconnected mid-session; the puppeteer script + screenshots above are the substitute evidence, same caveat as the "no video recorder" gap noted in earlier prompts.

### Open

- The "deerstalker mini-mark" is still the plain `Compass` icon (see R-4). Needs a real asset or an image-gen pass, not another hand-authored SVG attempt.
- Placeholder copy "Ask Sherlock…" used the prompt's own stated default without a separate owner confirmation round-trip, since the prompt explicitly offered it as the default.

## Prompt 9 correction (2026-09-15) — trigger shape reverted, chat structure actually changed

Owner feedback on the v2 pass above: "doesn't match well into the page" (later narrowed to: wrong shape/size for this site's language, not material or position), and "the overall structure of chat wasn't changed" (message bubbles, the titlebar, and the chip/input row all needed to actually change, not just the entry capsule). A third message during this pass: "it just doesn't have that magic, also the pre-selected things is taking too much space which is the main problem."

**Trigger reverted to a compact pill.** The v2 full-width capsule text-field (matching the mobile search capsule) was the wrong call - a launcher sitting next to a much smaller tab bar shouldn't be the same width and weight as the page's search field. `.chat-trigger` is back to a right-anchored compact pill (icon + "Ask Sherlock" label), but now sharing `.chat-sheet`'s and `.files-tab-bar`'s own floating-chrome material (chrome-glass + `blur(18px)` + `var(--window-shadow)`) instead of either the old flat `var(--chrome)` or v2's search-capsule fill - it reads as the same family of floating chrome as the tab bar beside it. Kept from v2: the icon-wrapper (`.chat-trigger-mark`, now 20px) for clean badge anchoring, and the R-5 hide-while-open fix (`aria-hidden` + opacity/pointer-events, never unmounted).

**Chat structure actually changed, not just the launcher:**
- **Titlebar:** title and status were both 13px muted - no hierarchy at all. Title is now `15px/650/var(--text)`; status stays small and muted below it.
- **Messages:** dropped the rounded chat-bubble treatment entirely (`.chat-message p` had `border-radius:14px; background:var(--sidebar)/var(--selected)`, an idiom nothing else on this site uses). Assistant replies now render as plain paragraph text at document body weight; persona/commentary lines get the desktop terminal's own `›` marker in `var(--accent)` (`TypedPersonaLine` unchanged, just wrapped) - real cross-surface consistency, not a cosmetic match. The user's tapped chip/typed query no longer gets a full bubble competing with Sherlock's answer - it's now a small muted pill-shaped tag, right-aligned.
- **Input row:** merged the separate input + "Ask" text-pill into one capsule (`.chat-input-capsule`, same translucent-fill recipe as the search capsule - this is where that material actually belonged) with an embedded circular accent button carrying a Lucide `ArrowUp` glyph - the iOS Messages compose-bar shape, not a generic input-plus-button row.

**"Pre-selected things taking too much space" - the actual reported blocker.** In the 45svh-capped card, `.chat-log` used a hardcoded `max-height: calc(45svh - 168px)`, and the starter-chip row (`.chat-starter-chips`) rendered permanently regardless of conversation state, together squeezing the real conversation log down to near-zero visible height (confirmed empirically: the log's text content was present in the DOM but not visible in the viewport until manually scrolled). Two fixes:
1. `.chat-log` is now `flex: 1 1 auto; min-height: 60px` instead of a magic-number subtraction - every other child of `.chat-sheet`'s flex column is already `flex-shrink: 0`, so the log now automatically claims whatever space its siblings don't use, in every state.
2. The starter-chip row only renders before the visitor's first ask (`!messages.some(m => m.from === "user")`) or while actively typing (live suggestions still show regardless of history). Once someone has asked one thing, the suggestion row disappears and the log gets the room - matching how Siri/Shortcuts-style suggestion chips work (an empty-state nudge, not permanent chrome).

**Not resolved:** "it just doesn't have that magic" is a real note but not something addressable without more specific direction - the structural/spacing complaints above were concrete and fixed; this one is flagged for the owner to point at something specific next round rather than guessed at further.

- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean (added scripts fixed to zero new warnings too). `npm run audit:site-tree` 17/17, `npm run verify:navigation` 20/20. `scripts/verify-prompt9-mobile-chat.mjs` re-run and updated for the new trigger geometry (compact pill assertions replacing the old full-width ones) - 16/16 pass. Screenshots regenerated: `scripts/prompt9-evidence/rest.png` (compact glass pill by the tab bar), `active.png` (card open, greeting log now actually visible on first open instead of squeezed to nothing), `active-log.png` (after asking "Selected work": plain-text assistant reply, `›` persona lines, small user tag, chips gone, real log space, new capsule input with circular send button).

## Prompt 9 "feels alive" pass (2026-09-15)

Owner: "It still doesn't feel alive enough." Considered and explicitly rejected a fake typing-indicator/response-delay (the classic "assistant is thinking..." pattern) - this codebase's own `nodeReply`/`openerFor` comment already states "no artificial delay" as a deliberate principle, and HANDOFF's hard rule is this navigator is deterministic, **NO AI, NO LLM calls**; faking a "thinking" beat would misrepresent that and reintroduce exactly the generic-chatbot feel the owner has been pushing back on all session. Didn't do it.

What actually was missing: every message in the log - text, persona lines, the "Open X" button, follow-up chips - just popped into the DOM with zero transition, every time, since the feature was built. That's the real "static" feeling, not missing latency.

- Each `.chat-message` now mounts as a `motion.div` (`initial`/`animate`, `motionOr(reducedMotion, BOARD_ENTER)` from `motion.ts` - the same "settles decisively, no bounce" token already used for content-pane swaps, reused rather than inventing a new one). Only genuinely new messages animate - framer-motion only replays `initial→animate` on first mount, so re-renders of already-shown messages don't re-trigger it.
- Directional motion matches each role's alignment: user tags (right-aligned) slide in from the right (`x: 10 → 0`), assistant content (left-aligned) rises slightly (`y: 8 → 0`) - not the same generic fade for both sides.
- Reduced motion: `initial` is `undefined` when `reducedMotion` is true, so the message is simply present with no animated property at all (not a zero-duration animation - genuinely static, per the existing `motionOr` convention).
- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean (same pre-existing warnings only). `npm run audit:site-tree` 17/17, `npm run verify:navigation` 20/20, `scripts/verify-prompt9-mobile-chat.mjs` 16/16 - all unaffected, this pass only touches how already-correct content animates in, not what data renders or where.

## "All sections" removed (2026-09-15)

Owner: the "All sections" starter chip's reply ("Every top-level section on the site:" + a chip for all 17 nodes) was taking up way too much of the 45svh card. Removed outright rather than restyled - `askAllSections()`, the `all: true` starter-chip entry, and the now-unused `listDir` import are all gone from `MobileChat.tsx`. Starter chips are now Selected work / Services / Engagement / About Anviq (four, matches what's actually useful to jump to first). The desktop terminal's own `ls`/`cd` commands still give the full listing for anyone who wants it - this was mobile-chat-only.

- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean. `npm run audit:site-tree` 17/17, `npm run verify:navigation` 20/20 (untouched - this only removed a chat-only convenience action, not a site route). Live-confirmed the starter-chip row now reads `["Selected work", "Services", "Engagement", "About Anviq"]` with no fifth chip.

## Siri-bar rewrite (2026-09-15)

Owner: "remove that section completely it should be pure chat and i already said i want a siri style look where its just 1 search bar until i type something which then types in that bar and gives answers magically above." This wasn't another incremental fix - the trigger-pill + modal-sheet architecture (state machine from Prompt 8, corrected in Prompt 9) is gone. `MobileChat.tsx` was rewritten from a two-state (rest pill → modal sheet) component into a single always-present element.

**New model:**
- One persistent `.chat-bar` (a real capsule text input, always mounted, always visible, anchored above `.files-tab-bar` with the same side/bottom rhythm math as before) - no separate trigger button that opens something else. This is the one place in this redesign where matching the mobile search capsule's material genuinely applies, because the bar is now actually an always-present input, not a button pretending to be one.
- Nothing renders above the bar until a question is asked (typed + submitted, or a follow-up chip tapped). No modal, no titlebar, no grabber, no drag-to-dismiss, no starter chips, no scrolling transcript.
- The answer to the current question floats above the bar in `.chat-answer` (chrome-glass card, same material family as the old sheet/tab bar), replacing whatever was there before - one answer at a time, not an accumulating log. A small `×` in the corner (`.chat-answer-dismiss`) closes it and fully disengages (blurs the bar, clears state, matches the old "Close Sherlock" semantics).
- Tapping a follow-up chip inside an answer (e.g. a project list after asking about "Selected work") replaces the panel in place, same spring pop-in each time.

**Preserved, unchanged underneath:** `matchIntent`, `siteTree`, the whole `guide.ts` engagement/badge/hint system (`useGuide(open)` still gets the same boolean contract, just renamed conceptually), `NODE_OPENER_LINES`/`GREETING_LINES` locked copy, `recordBookingClick`, the lightbox-close listener, Escape-to-dismiss, `pushCommandHistory` (still feeds the desktop terminal's shared suggestion history). Nothing in `guide.ts`, `tone.ts`, `chatIntents.ts`, `siteTree.ts`, `Terminal.tsx`, or `SiteNavigator.tsx` was touched.

**Real behavior changes, flagged (not silently dropped):**
- **R-0 greeting timing changed.** The once-per-visitor greeting (and the once-per-return-visit badge greeting) used to show the instant the old sheet opened, before anything else. In the single-bar model nothing shows until a real question is asked, so both now ride along with the *first* answer's persona line instead of appearing before it. The locked copy itself (`GREETING_LINES`, `getBadgeGreeting()`) is unchanged and still shown exactly once - only *when* it appears moved, to honor "pure bar until you type."
- **Ambient/evergreen hints also gated behind a first ask.** `guide.ts`'s idle-hint and "Not yet seen: X." progression hints are designed to fire "while a surface is open," which previously meant "while the sheet is open" (including before any question). Taken literally, that would mean an ambient suggestion could appear above the bar from focus alone, with nothing typed - which directly contradicts "just 1 search bar until i type something." Added a `hasAsked` ref and gated both the hint-injection effect and the evergreen fallback panel on it. Net effect: these nudges now only ever appear after a first real ask, replacing that answer, rather than being available to a visitor who has only focused the bar. This is a deliberate trade-off against the original intent of those hints (encouraging first use) in favor of the explicit new interaction model - flagged here rather than silently changed.
- **No more scrolling transcript.** Multi-turn history (seeing your last three questions) is gone by design - Siri/Spotlight show one current answer, not a log. If a real conversation history is wanted later, that's a new feature request, not a revert.
- **Titlebar/status line removed.** `guide.status` (the "12 sections · 4 projects · ..." line) had no home once the titlebar was removed; it's no longer shown anywhere in the mobile UI. Internally still computed and available if a future spot for it is wanted.

**Files:** `src/components/MobileChat.tsx` rewritten; `src/index.css` - `.chat-trigger*`, `.chat-card-anchor`, `.chat-sheet*`, `.chat-grabber*`, `.chat-titlebar*`, `.chat-log`, `.chat-message*`, `.chat-starter-chips`, `.chat-form`, `.chat-input-capsule*` all removed; new `.chat-bar-anchor`, `.chat-bar*`, `.chat-answer*` added; `.chat-persona`/`.chat-open-button`/`.chat-chip-row`/`.chat-chip`/`.chat-send`/`.chat-edge-tint` kept (adapted where the DOM nesting changed). Two dead `.chat-trigger:active` selectors cleaned out of the shared pressed-state lists. `scripts/verify-prompt9-mobile-chat.mjs` (tested the retired architecture) deleted; replaced with `scripts/verify-siri-bar.mjs`.

- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean (same five pre-existing warnings only). `npm run audit:site-tree` 17/17, `npm run verify:navigation` 20/20. `scripts/verify-siri-bar.mjs` - **19/19 PASS**: bar geometry (44px+ tall, 18px side margins matching the tab bar), no answer panel before any interaction, old trigger/sheet/titlebar/starter-chip markup all confirmed gone, edge tint appears on focus, **no answer panel from focus alone** (the core "pure bar" requirement), answer appears with query tag + Open button + follow-up chips after asking, input clears, follow-up chip tap replaces the panel (exactly one at a time), dismiss clears the panel and edge tint while the bar itself stays mounted. Screenshots: `scripts/prompt9-evidence/siri-rest.png`, `siri-focused.png`, `siri-answer.png`.

## Greeting reply (2026-09-15)

Owner, immediately after trying the Siri-bar rewrite: "it doesn't even answer to hi :D kind of kills the whole persona." Real gap - `matchIntent` only resolves to real site nodes, so a bare "hi" fell all the way to the generic "Not sure what that maps to" unmatched line, which reads as broken for a surface presented as a named persona ("Sherlock").

- Added `GREETING_REPLY` to `src/lib/tone.ts` - `"Hello. Now, to business — projects, services, or about?"` - flagged in a comment as new copy added directly at the owner's request this session (same first-draft/review status as anything else in that file; it's a locked-tone file, nothing gets added silently). Matches the file's existing em-dash-using persona voice, not the plain-hyphen house style used for Enrique's own outward copy elsewhere - this is in-character Sherlock text, not marketing/README copy, so the global no-em-dash rule doesn't apply to it (the file already uses em dashes throughout, e.g. the R-0 `GREETING_LINES`).
- Added a small deterministic `isGreeting()` check in `MobileChat.tsx` (fixed word list: hi/hello/hey/hiya/yo/sup/howdy/greetings - no NLP, no sentiment detection, same "no scoring model" spirit as `chatIntents.ts`), checked only when `matchIntent` finds no real node, so it can never shadow an actual page query.
- Priority preserved correctly: if this is a visitor's genuine first-ever ask and it happens to be "hi," they get the full once-per-visitor R-0 greeting (`introFor()`) - which already reads as a proper greeting - not the shorter `GREETING_REPLY`. Only a *later* "hi"/"hey" (after the R-0 greeting has already fired) gets the new line. Verified both paths live.
- Scoped to mobile only, matching the actual complaint - the desktop terminal is a literal command dispatcher (`open`, `cd`, `ls`), not presented as conversational, so "hi" being an unknown command there is normal terminal behavior with no persona gap to fix.
- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean (same five pre-existing warnings). `npm run audit:site-tree` 17/17, `npm run verify:navigation` 20/20, `scripts/verify-siri-bar.mjs` 19/19 (this change doesn't touch anything that script covers). Live-verified: fresh visitor's first "hi" → full R-0 greeting; a later "hey there" (after the R-0 greeting and one real question) → `GREETING_REPLY`. Screenshot: `scripts/prompt9-evidence/greeting-second.png`.

## Greeting reply, desktop parity (2026-09-15)

Owner: "desktop should be the same." Fair - the mobile-only fix left the desktop terminal answering "hi" with `unknown: hi - type help`, same dead-persona problem, different surface.

- Moved the greeting word list out of `MobileChat.tsx` and into `src/lib/tone.ts` as `GREETING_WORDS` (alongside `GREETING_REPLY`, which it was already sitting next to) - both surfaces now check literally the same list, not two lists that could quietly drift apart.
- `terminalCommands.ts`: added a `GREETING_SET` check before the verb `switch` (same tier as the `ALIASES` lookup, before dispatch) - a greeting is now a recognized, deliberate case (`{ greeting: true }`), not something that falls through to the `default: unknown` branch. New optional `greeting?: boolean` field on `TerminalResult`.
- `Terminal.tsx`: `if (result.greeting) sherlock = GREETING_REPLY;` - same line, same `›` rendering as every other Sherlock commentary line, no cap/one-time gating (matches mobile: this replies every time, not just once per visit).
- Not R-0-aware on desktop the way mobile is, and doesn't need to be: the desktop terminal already shows the full R-0 greeting immediately on open (that timing was never changed), so by the time someone could type "hi" the greeting has essentially always already fired. No `introFor()`-equivalent dance needed here - it was mobile-only because mobile's *opening* itself changed to stay silent until a real ask.
- **Validation:** `npx tsc -b --noEmit`, `npm run build`, `npm run lint` clean (same five pre-existing warnings). `npm run audit:site-tree` 17/17, `npm run verify:navigation` 20/20, `scripts/verify-siri-bar.mjs` 19/19 (desktop-only change, mobile script unaffected and still green). Live-verified on desktop: asked a real command first (so R-0 was already spent), then "hi" → `› Hello. Now, to business — projects, services, or about?`, identical text to the mobile reply. Screenshot taken and reviewed, not kept (scratch capture script and image both removed after verifying).

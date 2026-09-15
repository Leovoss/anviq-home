// Deterministic guidance layer - NO AI, no scoring model, no invented copy.
// Everything the guide says is either a real node name/summary from
// siteTree.ts or one of the fixed tone-map strings the owner reviews
// directly in src/lib/tone.ts. Both navigator surfaces (Terminal,
// MobileChat) call the same useGuide() - a forked copy in either surface
// is a bug.
//
// A hint's one-time flag is committed only when the surface actually
// closes (see `close()`) or the user explicitly dismisses it - never as a
// side effect of merely computing/rendering it. An earlier version
// committed inside a render-reactive effect and a real bug turned up in
// testing: opening the panel and computing the hint happen in the same
// batch, so the commit effect fired in the same tick and cleared the hint
// before a human could ever see it painted. Committing only on a genuine,
// separate user action (close/dismiss) removes that race entirely.
//
// Deliberately NOT implemented (flagged, not faked): the exact
// "carry unshown jokes to a later visit" queuing implied by the
// two-joke-per-visit cap - the cap itself IS enforced (JOKE_CAP_PER_VISIT),
// an over-cap event is just marked seen and dropped rather than queued.
// R-e's "unprompted legal read" is intentionally not wired separately from
// R-s, which already reacts to the same first visit to /privacy, /cookies,
// /terms - firing both would be two reactions to one click.

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { findNode, flattenRoutes, type SiteNode } from "@/lib/siteTree";
import {
  badgeGreetingForDays,
  BOOKING_HINT,
  CALENDLY_RETURN_HINT,
  DEDUCTION_ALL_SECTIONS,
  DEDUCTION_RETURN_VISIT,
  DEDUCTION_SECOND_CASE,
  EMAIL_COPY_HINT,
  FOURTH_CASE_HINT,
  GITHUB_CLICK_HINT,
  LIGHTBOX_PEEK_HINT,
  MULTI_DAY_RETURN_HINT,
  PRINT_HINT,
  SECTION_COMMENTARY,
  SOCIAL_HINT,
  TAB_RETURN_HINT,
  ZERO_RESULTS_HINT,
} from "@/lib/tone";

// Ship the email-copy reaction wired but silent until the owner reviews it
// (spec: "OWNER SIGN-OFF REQUIRED pre-merge"). Flip to true only on that
// explicit go-ahead.
const EMAIL_COPY_ENABLED = false;

const VISITED_KEY = "anviq-guide-visited";
const ONCE_KEY = "anviq-guide-once"; // rule ids that have fired, ever, for this visitor
const RETIRED_EMOJI_KEYS = ["anviq-guide-emoji-count", "anviq-guide-emojis-v2"];
const LAST_VISIT_KEY = "anviq-guide-last-visit-ms";
const BADGE_SHOWN_KEY = "anviq-guide-badge-first-shown-ms";
const MET_KEY = "met-sherlock";
const IDLE_MS = 20000;
const MULTI_DAY_MS = 24 * 60 * 60 * 1000;
const CALENDLY_RETURN_WINDOW_MS = 5 * 60 * 1000;
const JOKE_CAP_PER_VISIT = 2;

export const EXAMPLE_HINT = "Not sure what that means — try: steadyward";
export const IDLE_HINT = "Still here? Try a topic, or ls.";

const CASE_ORDER = [
  "/projects/steadyward",
  "/projects/lv-matching",
  "/projects/addreach",
  "/projects/recruitment-crm",
];
const CORE_AFTER_CASES = ["/engagement", "/approach", "/questions", "/contact/calendly"];

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function saveSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // Private mode etc. - worst case a once-only rule repeats next visit.
  }
}
function loadNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function saveNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

function retireEmojiCounter() {
  try {
    RETIRED_EMOJI_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

type PendingEvent = { id: string; text: string } | null;

// One mutable bundle + one pub-sub. Every cross-component signal (a
// booking click or a print event) goes through `bump`, which
// replaces the bundle's reference so the single useSyncExternalStore
// subscription below re-renders both navigator surfaces without either
// needing its own bespoke plumbing back to the other's trigger points.
let jokesThisVisit = 0;
const sessionOnce = new Set<string>();

let state = {
  onceFlags: loadSet(ONCE_KEY),
  pendingEvent: null as PendingEvent,
};
const bus = new EventTarget();
function bump(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  bus.dispatchEvent(new Event("change"));
}
function isSessionFlag(id: string) {
  return id.includes("this-session");
}
function subscribeBus(callback: () => void) {
  bus.addEventListener("change", callback);
  return () => bus.removeEventListener("change", callback);
}
function getSnapshot() {
  return state;
}

if (typeof window !== "undefined") retireEmojiCounter();

/** Exported for the two surfaces' own one-time tone-map lines (R-n node
 *  openers), which print inline in a transcript rather than through the
 *  shared hint banner. */
export function markOnce(id: string): boolean {
  if (hasOnce(id)) return false;
  if (isSessionFlag(id)) {
    sessionOnce.add(id);
    bump({});
    return true;
  }
  const onceFlags = new Set(state.onceFlags).add(id);
  saveSet(ONCE_KEY, onceFlags);
  bump({ onceFlags });
  return true;
}
export function hasOnce(id: string): boolean {
  if (isSessionFlag(id)) return sessionOnce.has(id);
  return state.onceFlags.has(id);
}

/** Two-joke-per-visit cap. Over-cap lines are marked seen and dropped
 *  rather than shown later detached from their trigger (anchoring rule). */
export function takeJokeSlot(): boolean {
  if (jokesThisVisit >= JOKE_CAP_PER_VISIT) return false;
  jokesThisVisit += 1;
  return true;
}

/** Once-per-visitor persona line, counting against the joke cap. */
export function tryPersona(id: string): boolean {
  if (hasOnce(id)) return false;
  if (!takeJokeSlot()) return false;
  markOnce(id);
  return true;
}

export function markMetSherlock() {
  markOnce(MET_KEY);
}

export function hasMetSherlock() {
  return hasOnce(MET_KEY);
}

export function noteBadgeShown() {
  if (loadNumber(BADGE_SHOWN_KEY) > 0) return;
  saveNumber(BADGE_SHOWN_KEY, Date.now());
}

export function getBadgeGreeting(): string {
  const shownAt = loadNumber(BADGE_SHOWN_KEY);
  if (!shownAt) return badgeGreetingForDays(4);
  const days = Math.floor((Date.now() - shownAt) / MULTI_DAY_MS);
  return badgeGreetingForDays(days);
}

export function isEvergreenHint(hint: string | null): boolean {
  return !!hint && hint.startsWith("Not yet seen:");
}

/** Queue a single global event-reaction line (R-d/R-e). One slot: a
 *  second event queued before the first is read is dropped rather than
 *  stacked - acceptable given the two-joke-per-visit cap makes stacking
 *  moot anyway. */
function queueEvent(id: string, text: string) {
  if (hasOnce(id) || state.pendingEvent) return;
  bump({ pendingEvent: { id, text } });
}

/** Call from anywhere (no hook needed) when the real booking link is clicked. */
export function recordBookingClick() {
  markOnce("booking-click");
  lastBookingClickMs = Date.now();
}

/** Wire from ScreenshotLightbox.tsx's real long-press "peek" gesture. */
export function recordLightboxPeek() {
  queueEvent("lightbox-peek", LIGHTBOX_PEEK_HINT);
}

/** Wire from the GitHub activity widget's real external repo link. */
export function recordGithubClick() {
  queueEvent("github-click", GITHUB_CLICK_HINT);
}

/** Wire from the existing search's own zero-suggestions branch. */
export function recordSearchZeroResults() {
  queueEvent("zero-results", ZERO_RESULTS_HINT);
}

/** Wired but inert - see EMAIL_COPY_ENABLED above. */
export function recordEmailCopy() {
  if (!EMAIL_COPY_ENABLED) return;
  queueEvent("email-copy", EMAIL_COPY_HINT);
}

// --- module-load-time, one-shot detections: these don't need a component
// to call them, so they're wired here directly against real platform APIs.

let lastBookingClickMs = 0;

(function detectReturnAndElapsedTime() {
  if (typeof window === "undefined") return;
  const hasVisitedBefore = loadNumber(LAST_VISIT_KEY) > 0;
  const lastVisitMs = loadNumber(LAST_VISIT_KEY);
  const now = Date.now();
  saveNumber(LAST_VISIT_KEY, now);
  if (!hasVisitedBefore) return;
  let isNewSession = false;
  try {
    isNewSession = !sessionStorage.getItem("anviq-guide-session");
    sessionStorage.setItem("anviq-guide-session", "1");
  } catch {
    // ignore
  }
  if (!isNewSession) return;
  if (now - lastVisitMs > MULTI_DAY_MS) {
    queueEvent("multi-day-return", MULTI_DAY_RETURN_HINT);
  } else {
    queueEvent("return-visit", DEDUCTION_RETURN_VISIT);
  }
})();

if (typeof document !== "undefined") {
  let hasBeenHidden = false;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hasBeenHidden = true;
      return;
    }
    if (document.visibilityState !== "visible" || !hasBeenHidden) return;
    if (lastBookingClickMs && Date.now() - lastBookingClickMs < CALENDLY_RETURN_WINDOW_MS) {
      queueEvent("calendly-return", CALENDLY_RETURN_HINT);
    } else {
      queueEvent("tab-return", TAB_RETURN_HINT);
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeprint", () => queueEvent("print", PRINT_HINT));
}

// Real router pathname -> tree node (reverses the /explore/ stripping).
function nodeForRoute(pathname: string): SiteNode | undefined {
  return flattenRoutes().find((node) => node.route === pathname);
}

const SECTIONS = (findNode("/")?.children ?? []).filter((node) => node.path !== "/contact");
const PROJECTS = findNode("/projects")?.children ?? [];

function coreProgression(visited: Set<string>): SiteNode | undefined {
  if (!visited.has("/projects")) return findNode("/projects");
  const nextCase = CASE_ORDER.find((path) => !visited.has(path));
  if (nextCase) return findNode(nextCase);
  const nextCore = CORE_AFTER_CASES.find((path) => !visited.has(path));
  return nextCore ? findNode(nextCore) : undefined;
}

export interface BadgeState {
  count: number;
  items: string[];
  name: string;
}

export interface GuideApi {
  visited: Set<string>;
  hint: string | null;
  status: string;
  badge: BadgeState;
  /** User acknowledged the current hint via the banner's own close button. */
  dismiss: () => void;
  /** Surfaces call this when the panel closes, however it closed (Esc,
   *  backdrop click, trigger toggle) - commits whatever hint was showing,
   *  same as dismiss, so a read-then-closed hint doesn't reappear either. */
  close: () => void;
  /** `type: "unmatched"` - call once per unresolved terminal command / chat query. */
  recordAction: (type: "unmatched") => void;
}

export function useGuide(isOpen: boolean): GuideApi {
  const location = useLocation();
  // Read-only: forces a re-render when a global signal (a booking click or
  // a print event, fired from outside this hook's own
  // tree) changes.
  useSyncExternalStore(subscribeBus, getSnapshot, getSnapshot);
  const [visited, setVisited] = useState<Set<string>>(() => loadSet(VISITED_KEY));
  const [idleHintReady, setIdleHintReady] = useState(false);
  const [pendingCommentary, setPendingCommentary] = useState<string | null>(null);
  // The evergreen progression line isn't a "once" rule (it's the fallback,
  // always live), so dismissing it can't permanently mark it done - it
  // just hides this specific suggestion until the target changes (i.e.
  // until the user actually visits it, or something higher-priority
  // pushes it aside in the meantime).
  const [dismissedTarget, setDismissedTarget] = useState<string | null>(null);

  // Track visited real pages via the router (passive browsing counts,
  // whether or not a navigator surface is open); queue R-s commentary,
  // the "second case" and "all sections" deductions, and the "4th case"
  // reaction off the same real navigation signal.
  // Deliberately reads `visited` from the closure rather than a functional
  // updater - queuing state as a side effect inside a setState updater is
  // impure, and StrictMode's dev-mode double-invocation of updater
  // functions made that flaky in practice (a real bug found by testing).
  useEffect(() => {
    const node = nodeForRoute(location.pathname);
    if (!node || node.path === "/" || visited.has(node.path)) return;
    const next = new Set(visited).add(node.path);
    saveSet(VISITED_KEY, next);
    setVisited(next);
    if (SECTION_COMMENTARY[node.path] && !hasOnce(`commentary:${node.path}`)) {
      setPendingCommentary(node.path);
    }
    const casesVisited = CASE_ORDER.filter((path) => next.has(path)).length;
    if (casesVisited === 2) queueEvent("deduction-second-case", DEDUCTION_SECOND_CASE);
    if (casesVisited === CASE_ORDER.length) queueEvent("fourth-case", FOURTH_CASE_HINT);
    if (SECTIONS.every((section) => next.has(section.path))) {
      queueEvent("deduction-all-sections", DEDUCTION_ALL_SECTIONS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Rule d: one idle hint per session, only while a surface is open.
  useEffect(() => {
    if (!isOpen) return;
    setIdleHintReady(false);
    const id = window.setTimeout(() => setIdleHintReady(true), IDLE_MS);
    return () => window.clearTimeout(id);
  }, [isOpen, location.pathname]);

  const recordAction: GuideApi["recordAction"] = () => {
    // Unmatched rescue is anchored in the surface transcript, not the banner.
  };

  // Priority order, highest first. Direct, timely reactions to something
  // the user/system just did (R-s, the deductions, R-e events) outrank
  // the ambient idle nudge; booking/social are one-time visit-level
  // nudges below all of those; the evergreen progression is the fallback.
  // Unmatched-input rescue is owned by the surfaces (anchored to the
  // unknown command / chat line), not the banner.
  function currentHint(): string | null {
    if (pendingCommentary && SECTION_COMMENTARY[pendingCommentary] && !hasOnce(`commentary:${pendingCommentary}`)) {
      return SECTION_COMMENTARY[pendingCommentary];
    }
    if (state.pendingEvent && !hasOnce(state.pendingEvent.id)) {
      return state.pendingEvent.text;
    }
    if (isOpen && idleHintReady && !hasOnce("idle-this-session")) {
      // Session-scoped (not visitor-scoped): tracked in memory only, so it
      // can fire again on a later visit, matching "once per session".
      return IDLE_HINT;
    }
    if (visited.size >= 3 && !hasOnce("rule-c-booking")) {
      return BOOKING_HINT;
    }
    if (visited.size >= 3 && !hasOnce("booking-click") && !hasOnce("rule-f-social")) {
      return SOCIAL_HINT;
    }
    const next = coreProgression(visited);
    if (!next) return null;
    if (next.path === dismissedTarget) return null;
    return `Not yet seen: ${next.name}.`;
  }

  const hint = currentHint();

  // Commit whichever hint is currently showing: mark its one-time flag
  // (except the evergreen progression line, which isn't a "once" rule -
  // dismissing it just hides that specific target) and clear any
  // transient state so the next computation naturally falls through to
  // the next-priority hint.
  function commitCurrentHint() {
    if (!hint) return;
    if (pendingCommentary && hint === SECTION_COMMENTARY[pendingCommentary]) {
      // Cap reached: mark it seen anyway rather than let it block every
      // lower-priority hint from now on (the full carry-to-next-visit
      // queue this implies isn't built - see the module note above).
      takeJokeSlot();
      markOnce(`commentary:${pendingCommentary}`);
      setPendingCommentary(null);
    } else if (state.pendingEvent && hint === state.pendingEvent.text) {
      if (takeJokeSlot()) markOnce(state.pendingEvent.id);
      bump({ pendingEvent: null });
    } else if (hint === BOOKING_HINT) {
      if (takeJokeSlot()) markOnce("rule-c-booking");
    } else if (hint === SOCIAL_HINT) {
      if (takeJokeSlot()) markOnce("rule-f-social");
    } else if (hint === IDLE_HINT) {
      markOnce("idle-this-session");
    } else {
      const target = coreProgression(visited);
      if (target) setDismissedTarget(target.path);
    }
  }

  const next = coreProgression(visited);
  const status = [
    `${SECTIONS.length} sections`,
    `${PROJECTS.length} projects`,
    `${visited.size} visited`,
    next ? `not yet: ${next.name}` : "all visited",
  ].join(" · ");

  const met = hasMetSherlock();
  const badgeItems: string[] = [];
  if (!met) badgeItems.push("you haven't met yet");
  // Only genuinely queued items, never the ambient evergreen / idle
  // progression. Counting those re-inflated the badge after first open.
  if (
    pendingCommentary &&
    SECTION_COMMENTARY[pendingCommentary] &&
    !hasOnce(`commentary:${pendingCommentary}`)
  ) {
    badgeItems.push(SECTION_COMMENTARY[pendingCommentary]);
  }
  if (state.pendingEvent && !hasOnce(state.pendingEvent.id)) {
    badgeItems.push(state.pendingEvent.text);
  }
  const count = badgeItems.length;
  const badge: BadgeState = {
    count,
    items: badgeItems,
    name:
      count === 0
        ? ""
        : `Sherlock, ${count} pending suggestion${count === 1 ? "" : "s"}: ${badgeItems[0]}`,
  };

  useEffect(() => {
    if (count > 0) noteBadgeShown();
  }, [count]);

  return {
    visited,
    hint,
    status,
    badge,
    dismiss: commitCurrentHint,
    close: commitCurrentHint,
    recordAction,
  };
}

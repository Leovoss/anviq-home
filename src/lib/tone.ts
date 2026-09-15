// Sherlock tone map. Every visitor-facing string in this file is LOCKED
// from the build spec, verbatim. This is the file to review before merge -
// nothing here is generated or paraphrased; each entry cites which real
// tree path/event it's attached to. Keyed by real route/tree path so it's
// mechanically checkable against src/lib/siteTree.ts, never a free-floating
// string with no anchor.

// R-0: first-ever open, either surface, exactly once. Two lines - the one
// locked exception to "personality is one line max."
export const GREETING_LINES = [
  "Sherlock, finder of things. I deduce you've come to see the work — you are, after all, on the work website.",
  "The other one retired to Sussex to keep bees. I was replaced by Spotlight in 2005. One of us drew the short straw.",
];

// R-n: fires once per visitor, the moment a project case is opened (via
// `open <path>` in the terminal or a deep-open in chat) - keyed by the
// case's real route, which is identical to its tree path for projects.
export const NODE_OPENER_LINES: Record<string, string> = {
  "/projects/steadyward": "Retention infrastructure. So far, you are retained.",
  "/projects/lv-matching": "Minds its own tenants. Built like the lawyers were in the room.",
  "/projects/addreach": "Outbound automation. You, however, arrived of your own free will.",
  "/projects/recruitment-crm": "Anonymized client. Sherlock keeps oaths.",
  "/projects/agents": "AI teammates that stay on your own hardware. No wandering off to a hyperscaler.",
};

// R-s: fires once per visitor, the first time a section is visited -
// including passive browsing with no navigator surface open (guide.ts
// fires this from the router subscription, not from a click inside the
// terminal/chat). Keyed by tree path.
export const SECTION_COMMENTARY: Record<string, string> = {
  "/services": "Three ways to hire him. Pick your commitment level.",
  "/engagement": "Terms of engagement, actually readable. Rare artifact.",
  "/approach": "How the work runs. No process theater.",
  "/constraints": "The page where clients get told no. They read it twice.",
  "/questions": "Answers pre-loaded. Suspiciously efficient.",
  "/activity": "Live commits. GitHub doesn't do marketing copy.",
  "/about": "One engineer. The org chart is a post-it.",
  "/privacy": "No cookies here. The footer reaction stays in the footer.",
  "/cookies": "No cookies here. The footer reaction stays in the footer.",
  "/terms": "No cookies here. The footer reaction stays in the footer.",
};

// Rule c: fires once per visitor when visited.size crosses 3.
export const BOOKING_HINT =
  "You've done the diligence. The calendar is the next click. Strictly business.";

// Rule f: fires once per visitor, 3+ sections visited and no booking click yet.
export const SOCIAL_HINT =
  "If async is more your speed — LinkedIn and X are real, and he answers.";

// R-d deductions - pompous observation of an obvious, COARSE fact, never
// granular behaviour (no times, hovers, scroll depths). Capped at these
// three, by spec ("highest overcook risk").
export const DEDUCTION_SECOND_CASE =
  "Two cases opened, neither closed. Deduction: you're comparing.";
export const DEDUCTION_ALL_SECTIONS =
  "Every folder opened. Deduction: very thorough or very lost. The calendar is next either way.";
export const DEDUCTION_RETURN_VISIT =
  "You left, then returned. Deduction: the other tabs disappointed.";

// R-e event reactions, each once per visitor. Only wired for features that
// actually exist in this repo (see guide.ts and each call site's own
// comment for exactly which real event triggers it) - the spec explicitly
// forbids inventing a trigger for a feature that doesn't exist, so several
// listed in the brief (long-press lightbox peek is the one exception that
// IS wired; GitHub widget click and unprompted-legal-read overlap R-s and
// were left out to avoid a duplicate reaction to the same click) are
// covered below and the rest are not present.
export const FOURTH_CASE_HINT = "All four. The portfolio review is complete.";
export const MULTI_DAY_RETURN_HINT = 'Filed you under "thinking it over." Correctly.';
export const TAB_RETURN_HINT = "Welcome back. Nothing moved. Discipline.";
export const LIGHTBOX_PEEK_HINT = "A proper inspection. The README holds up to it.";
export const GITHUB_CLICK_HINT = "Straight to the commit log. Sherlock respects it.";
// OWNER SIGN-OFF REQUIRED pre-merge - wired but held inert, see guide.ts.
export const EMAIL_COPY_HINT = "Copied. A person of action.";
export const ZERO_RESULTS_HINT = 'Nothing. Try "projects." Or ask a human.';
export const CALENDLY_RETURN_HINT = "Window-shopped the calendar. It holds.";
export const PRINT_HINT = "Filing this for the archive. Noted.";

// R-c: command commentary. Each fires once per visitor, queued under the
// two-joke-per-visit cap, and may only render as a response bound to the
// command that triggered it (see the anchoring rule in Terminal.tsx).
export const COMMAND_COMMENTARY = {
  sudo: "There is no sudo here. The oaths are load-bearing.",
  alias: "dir works. Sherlock doesn't judge. He notes.",
  clear: "The scrollback forgets. Sherlock remembers. Briefly.",
  pwd: "You are here. It has rarely been truer.",
  exit: "There is no exit. There is only Esc.",
  helpTwice: "Help, twice. Thorough or lost. Both welcome.",
  whitespace: "Whitespace received. Acknowledged. Ignored.",
} as const;

// A bare greeting ("hi"/"hey"/etc.) isn't a page query, but answering it
// with the generic "not sure what that maps to" / "unknown command" line
// read as dead persona - added directly at the owner's request this
// session, first draft, same review-before-merge status as anything else
// in this file. Shared word list so the chat and the terminal recognize
// exactly the same greetings and answer with exactly the same line.
export const GREETING_WORDS = ["hi", "hello", "hey", "hiya", "yo", "sup", "howdy", "greetings"] as const;
export const GREETING_REPLY = "Hello. Now, to business — projects, services, or about?";

// First open via a badged control, before R-0. The four-day line is the
// locked default; `badgeGreetingForDays` swaps in a derived duration when
// we have a real first-badge-render timestamp.
export const BADGE_GREETING_DEFAULT =
  "That badge was up for four days. I counted. It's what I do.";

export function badgeGreetingForDays(days: number): string {
  if (days <= 0) return "That badge was up today. I counted. It's what I do.";
  if (days === 1) return "That badge was up for a day. I counted. It's what I do.";
  if (days === 4) return BADGE_GREETING_DEFAULT;
  return `That badge was up for ${days} days. I counted. It's what I do.`;
}

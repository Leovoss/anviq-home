// Single source of truth for the site's navigable filesystem.
//
// Every node here mirrors a route that actually exists in src/App.tsx's
// router and is actually reachable through the `active` switch in
// src/pages/Home.tsx - see scripts/audit-site-tree.mjs, which loads this
// module and cross-checks it against that switch statement so a page added
// or removed later without updating this file fails loudly instead of
// drifting quietly.
//
// `/explore/browse` is included even though it falls outside the owner's
// 16-route inventory (2026-09-13): it is a real, distinctly-rendered route
// (the touch-layout equivalent of the desktop sidebar, see FilesBrowse in
// src/components/FilesNavigation.tsx), matched by the live `/explore/:section`
// route, not a redirect and not a 404. Flagged per the grounding rule rather
// than silently added or dropped.

export type NodeKind = "folder" | "file" | "link";

export interface SiteNode {
  /** Canonical tree path - the `/explore/` prefix is stripped here since the
   *  filesystem view strips it too. Project paths keep their real shape,
   *  since the real route already has no prefix. */
  path: string;
  /** Display name, reused verbatim from the existing UI. */
  name: string;
  kind: NodeKind;
  /** The real React Router URL this node opens. Absent for `kind: "link"`
   *  nodes, which open `href` instead - there is no internal route for an
   *  external destination. */
  route?: string;
  /** External URL, `kind: "link"` only, copied verbatim from the component
   *  that already renders it (see the citation on each link node below). */
  href?: string;
  /** One line, extracted from the page's own copy (heading or first
   *  sentence) - never paraphrased. */
  summary: string;
  /** Short names for command resolution. Not UI copy - authored for
   *  convenience, several grounded in real legacy redirects (see App.tsx). */
  aliases?: string[];
  children?: SiteNode[];
}

export const SITE_TREE: SiteNode = {
  path: "/",
  name: "Anviq",
  kind: "folder",
  route: "/",
  // Overview h1, src/pages/Home.tsx `function Overview()`.
  summary: "Systems built to hold.",
  aliases: ["overview", "home"],
  children: [
    {
      path: "/services",
      name: "Services",
      kind: "file",
      route: "/explore/services",
      // Services h1 (DocumentPage title), `function Services()`.
      summary: "Three things, one point of contact.",
    },
    {
      path: "/projects",
      name: "Selected work",
      kind: "folder",
      route: "/explore/projects",
      // Desktop project-list sub-line, `function ProjectBrowser()`.
      summary: "Independent builds",
      aliases: ["work", "selected-work", "ship-log"],
      children: [
        {
          path: "/projects/agents",
          name: "Anviq Agents",
          kind: "file",
          route: "/projects/agents",
          // WORK_SELECTED[0].body, src/data/content.ts.
          summary:
            "Persistent AI teammates that do real work inside a business, with memory, routines, and tools, and run any risky code in its own isolated machine on hardware the business controls.",
        },
        {
          path: "/projects/steadyward",
          name: "Steadyward",
          kind: "file",
          route: "/projects/steadyward",
          // WORK_SELECTED[1].body, src/data/content.ts.
          summary:
            "A read-only behavioural retention layer for MT4/MT5 brokers: pattern detection on live trading accounts, white-label trader alerts, no execution access.",
        },
        {
          path: "/projects/lv-matching",
          name: "LV Matching",
          kind: "file",
          route: "/projects/lv-matching",
          // WORK_SELECTED[2].body, src/data/content.ts.
          summary:
            "Construction bill-of-quantities matching for multiple tenants, with a chat-and-grid interface, EU-hosted auth, and data handling built for GDPR from the schema up.",
          aliases: ["lv"],
        },
        {
          path: "/projects/addreach",
          name: "Addreach",
          kind: "file",
          route: "/projects/addreach",
          // WORK_SELECTED[3].body, src/data/content.ts.
          summary:
            "Cold-outreach product for a German market: automated sending infrastructure with deliverability and compliance built into the pipeline, not bolted on after.",
        },
        {
          path: "/projects/recruitment-crm",
          name: "Automated Recruitment CRM",
          kind: "file",
          route: "/projects/recruitment-crm",
          // WORK_SELECTED[4].body (first sentence), src/data/content.ts.
          summary:
            "Runs the full loop from ad-sourced CV intake to legally-sequenced outreach to placement, for a German recruitment operation.",
          aliases: ["crm"],
        },
      ],
    },
    {
      path: "/approach",
      name: "Approach",
      kind: "file",
      route: "/explore/approach",
      // Approach h1, `function Approach()`.
      summary: "Own the delivery.",
    },
    {
      path: "/engagement",
      name: "Engagement",
      kind: "file",
      route: "/explore/engagement",
      // Engagement h1, `function Engagement()`.
      summary: "Working together.",
    },
    {
      path: "/constraints",
      name: "Constraints",
      kind: "file",
      route: "/explore/constraints",
      // Constraints h1, `function Constraints()`.
      summary: "How this is operated.",
    },
    {
      path: "/questions",
      name: "Questions",
      kind: "file",
      route: "/explore/questions",
      // Questions h1, `function Questions()`.
      summary: "Common questions.",
    },
    {
      path: "/activity",
      name: "Activity",
      kind: "file",
      route: "/explore/activity",
      // Activity DocumentPage title, inline in `Home()`'s "activity" case.
      summary: "Public activity.",
    },
    {
      path: "/about",
      name: "About Anviq",
      kind: "file",
      route: "/explore/about",
      // About intro, first sentence, `function About()`.
      summary: "Anviq is an independent IT consulting and software practice.",
      // Grounded: /explore/founder redirects to /explore/about in App.tsx.
      aliases: ["founder"],
    },
    {
      path: "/privacy",
      name: "Privacy Policy",
      kind: "file",
      route: "/explore/privacy",
      // Privacy.tsx, first sentence.
      summary:
        'This Privacy Policy explains how we handle personal data in connection with this website (the "Site") at anviq.net.',
    },
    {
      path: "/cookies",
      name: "Cookie Policy",
      kind: "file",
      route: "/explore/cookies",
      // Cookies.tsx, first sentence.
      summary:
        "Cookies are small files a website can store on your device.",
    },
    {
      path: "/terms",
      name: "Terms & Disclaimer",
      kind: "file",
      route: "/explore/terms",
      // Terms.tsx, first sentence.
      summary:
        'These terms apply to your use of this website (the "Site") at anviq.net.',
    },
    {
      // Synthetic grouping node, not a real route (no `route` field, and it
      // is deliberately excluded from scripts/audit-site-tree.mjs's
      // route-parity check for that reason) - it exists only to hold the
      // real external contact links as tree nodes so the navigators can
      // point at them the same way they point at pages. Flagged, not
      // hidden, per the grounding rule.
      path: "/contact",
      name: "Contact",
      kind: "folder",
      summary: "Ways to reach Anviq directly.",
      children: [
        {
          path: "/contact/calendly",
          name: "Book a call",
          kind: "link",
          // Default ContactLink href, src/pages/Home.tsx `function ContactLink`.
          href: "https://calendly.com/lvoss-anviq/30min?month=2026-09",
          summary: "Start a conversation.",
          aliases: ["calendly", "book", "booking"],
        },
        {
          path: "/contact/linkedin",
          name: "LinkedIn",
          kind: "link",
          // src/pages/Home.tsx site-footer social links.
          href: "https://www.linkedin.com/in/v-leonardo/",
          summary: "Leonardo Voss on LinkedIn.",
        },
        {
          path: "/contact/x",
          name: "X",
          kind: "link",
          // src/pages/Home.tsx site-footer social links.
          href: "https://x.com/thereallvoss",
          summary: "Leonardo Voss on X.",
        },
        {
          path: "/contact/email",
          name: "Email",
          kind: "link",
          // src/pages/Home.tsx site-footer mailto link.
          href: "mailto:lvoss@anviq.net",
          summary: "lvoss@anviq.net",
          aliases: ["mailto", "mail"],
        },
      ],
    },
    {
      path: "/browse",
      name: "Browse",
      kind: "file",
      route: "/explore/browse",
      // Not in the owner's 16-route inventory - see the module note above.
      // FilesBrowse's own group headings, src/components/FilesNavigation.tsx.
      summary: "Locations, Favorites, Information.",
    },
  ],
};

function segmentName(path: string): string {
  if (path === "/") return "";
  return path.slice(path.lastIndexOf("/") + 1);
}

/** Lowercase alphanumerics only, so "Selected work", "selected-work" and
 *  "selectedwork" collapse to the same key. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function matches(node: SiteNode, segment: string): boolean {
  const target = segment.trim().toLowerCase();
  if (!target) return false;
  const targetNorm = normalize(segment);
  if (segmentName(node.path).toLowerCase() === target) return true;
  if (node.name.toLowerCase() === target) return true;
  if (normalize(segmentName(node.path)) === targetNorm) return true;
  if (normalize(node.name) === targetNorm) return true;
  return (
    node.aliases?.some(
      (alias) => alias.toLowerCase() === target || normalize(alias) === targetNorm,
    ) ?? false
  );
}

/** Path segment, display name, and aliases - the tokens a typed command
 *  or a completion matcher may use to point at this node. */
export function nodeTokens(node: SiteNode): string[] {
  const segment = segmentName(node.path);
  return [...new Set([segment, node.name, ...(node.aliases ?? [])].filter(Boolean))];
}

/** Depth-first walk of every node, root included. */
export function flattenRoutes(): SiteNode[] {
  const out: SiteNode[] = [];
  const walk = (node: SiteNode) => {
    out.push(node);
    node.children?.forEach(walk);
  };
  walk(SITE_TREE);
  return out;
}

/** Exact match on a node's canonical `path`. */
export function findNode(path: string): SiteNode | undefined {
  return flattenRoutes().find((node) => node.path === path);
}

/** A folder's direct children, or undefined if `path` is not a folder. */
export function listDir(path: string): SiteNode[] | undefined {
  const node = findNode(path);
  return node?.kind === "folder" ? (node.children ?? []) : undefined;
}

function walkPath(cwd: string, input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed || trimmed === ".") return findNode(cwd) ? cwd : undefined;

  const startAbsolute = trimmed.startsWith("/");
  const rawSegments = (startAbsolute ? trimmed : `${cwd}/${trimmed}`)
    .split("/")
    .filter(Boolean);

  let node = SITE_TREE;
  const resolvedSegments: string[] = [];

  for (const segment of rawSegments) {
    if (segment === ".") continue;
    if (segment === "..") {
      resolvedSegments.pop();
      const parentPath = resolvedSegments.length
        ? `/${resolvedSegments.join("/")}`
        : "/";
      const parent = findNode(parentPath);
      if (!parent) return undefined;
      node = parent;
      continue;
    }
    const next = node.children?.find((child) => matches(child, segment));
    if (!next) return undefined;
    node = next;
    resolvedSegments.push(segmentName(node.path));
  }

  return node.path;
}

/**
 * Terminal-style path resolution: absolute (`/projects`), relative
 * (`steadyward`, `../services`), `.`/`..`, a display name (`Selected work`),
 * or an alias, resolved against `cwd`. If the walk from `cwd` misses, a
 * unique global match on name/alias/segment still resolves - `open` from
 * root by the name `ls` printed must work. Ambiguous global hits return
 * undefined rather than guessing.
 */
export function resolvePath(cwd: string, input: string): string | undefined {
  const walked = walkPath(cwd, input);
  if (walked) return walked;
  const trimmed = input.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") return undefined;
  const hits = flattenRoutes().filter((node) => matches(node, trimmed));
  if (hits.length === 1) return hits[0].path;
  return undefined;
}

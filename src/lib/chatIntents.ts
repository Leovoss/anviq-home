// Keyword resolution for the mobile chat navigator. Same job as the
// desktop terminal's command dispatch (src/lib/terminalCommands.ts), same
// data (src/lib/siteTree.ts) - just matched by loose keywords instead of a
// typed path, since a phone keyboard is the wrong tool for `cd projects`.
//
// No NLP, no scoring model, no second content list: every keyword is
// derived straight from the tree (path segments, aliases, name words), so
// there is nothing to keep in sync by hand.

import { flattenRoutes, type SiteNode } from "@/lib/siteTree";

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function keywordsFor(node: SiteNode): string[] {
  const segment = node.path === "/" ? [] : wordsOf(node.path.slice(node.path.lastIndexOf("/") + 1));
  const aliasWords = (node.aliases ?? []).flatMap(wordsOf);
  const nameWords = wordsOf(node.name);
  return [...new Set([...segment, ...aliasWords, ...nameWords])];
}

let index: Map<string, SiteNode> | undefined;

function keywordIndex(): Map<string, SiteNode> {
  if (index) return index;
  index = new Map();
  // Root first, then declaration order, so a more specific later match
  // (e.g. a project's own name) overrides a generic earlier one.
  for (const node of flattenRoutes()) {
    for (const keyword of keywordsFor(node)) {
      if (!index.has(keyword)) index.set(keyword, node);
    }
  }
  return index;
}

/**
 * Deterministic keyword lookup: the first word in `query` that matches a
 * real node's path segment, alias, or name wins. No fuzzy matching, no
 * ranking - the same query always resolves to the same node.
 */
export function matchIntent(query: string): SiteNode | undefined {
  const table = keywordIndex();
  for (const word of wordsOf(query)) {
    const node = table.get(word);
    if (node) return node;
  }
  return undefined;
}

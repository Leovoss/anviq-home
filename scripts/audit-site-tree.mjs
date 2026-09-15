// Dev-time audit for src/lib/siteTree.ts.
//
// 1. Prints the tree (path -> route -> name) so a human can eyeball it
//    against the known route inventory.
// 2. Reconstructs the *actually registered* routes straight from
//    src/pages/Home.tsx's `switch (active)` (the real control flow that
//    decides what renders, not just the sidebar nav list, so it also
//    catches routes like /explore/browse that never appear in NAV) and
//    from SLUGS, then diffs that set against siteTree's flattenRoutes().
//    Any drift - a case added or removed without updating siteTree.ts -
//    fails the process loudly.
//
// Run: node scripts/audit-site-tree.mjs

import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom" });
const { SITE_TREE, flattenRoutes } = await server.ssrLoadModule("/src/lib/siteTree.ts");
await server.close();

// --- print the tree ---------------------------------------------------

function printTree(node, depth = 0) {
  const indent = "  ".repeat(depth);
  const dest = node.route ?? (node.href ? `${node.href} (external)` : "(no destination - synthetic grouping)");
  console.log(`${indent}${node.path}  ->  ${dest}  ->  ${node.name}`);
  node.children?.forEach((child) => printTree(child, depth + 1));
}

console.log("Site tree (tree path -> real route -> display name)\n");
printTree(SITE_TREE);

// --- reconstruct the registered routes from Home.tsx -------------------

const homeSrc = readFileSync(path.join(root, "src/pages/Home.tsx"), "utf8");

const switchBlock = homeSrc.match(/switch \(active\) \{([\s\S]*?)\n {2}\}/);
if (!switchBlock) {
  console.error("\nCould not find `switch (active)` in src/pages/Home.tsx - Home.tsx changed shape, update this script.");
  process.exit(1);
}
const sections = [...switchBlock[1].matchAll(/case "([a-z-]+)":/g)].map((m) => m[1]);

const slugsMatch = homeSrc.match(/const SLUGS = \[([^\]]*)\];/);
if (!slugsMatch) {
  console.error("\nCould not find `const SLUGS = [...]` in src/pages/Home.tsx - update this script.");
  process.exit(1);
}
const slugs = [...slugsMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const registered = new Set([
  ...sections.map((id) => (id === "overview" ? "/" : `/explore/${id}`)),
  ...slugs.map((slug) => `/projects/${slug}`),
]);

// Link nodes (external URLs) and the synthetic /contact grouping folder
// have no internal route by design - they are excluded from the router
// parity check, not silently, but by construction (no `route` field).
const allNodes = flattenRoutes();
const shapeErrors = allNodes.filter(
  (n) => n.kind === "link" ? !n.href : n.path !== "/contact" && !n.route,
);
if (shapeErrors.length) {
  console.error(
    "\nSITE TREE SHAPE ERROR: every non-link node except /contact needs a `route`, every link node needs an `href`:",
    shapeErrors.map((n) => n.path),
  );
  process.exit(1);
}

const treeRoutes = new Set(allNodes.map((n) => n.route).filter(Boolean));

const missingFromTree = [...registered].filter((r) => !treeRoutes.has(r));
const extraInTree = [...treeRoutes].filter((r) => !registered.has(r));

console.log(`\n${registered.size} routes registered in Home.tsx, ${treeRoutes.size} routes in siteTree.ts.`);

const KNOWN_INVENTORY_SIZE = 16;
if (treeRoutes.size !== KNOWN_INVENTORY_SIZE) {
  console.log(
    `Note: tree has ${treeRoutes.size} routes, not the owner-verified ${KNOWN_INVENTORY_SIZE} - ` +
      `/explore/browse is included and flagged (see siteTree.ts header comment) as a real route outside that inventory.`,
  );
}

if (missingFromTree.length || extraInTree.length) {
  console.error("\nSITE TREE OUT OF SYNC WITH Home.tsx:");
  if (missingFromTree.length) console.error("  Registered in Home.tsx but missing from siteTree.ts:", missingFromTree);
  if (extraInTree.length) console.error("  In siteTree.ts but not a registered Home.tsx route:", extraInTree);
  process.exit(1);
}

console.log("OK: siteTree.ts exactly matches the routes Home.tsx's switch actually renders.");

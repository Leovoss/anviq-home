// Resolves every siteTree node through the terminal's `open` and the chat's
// matchIntent and checks it lands on the node's route or href. Headless, so
// it doesn't cover real browser navigation.
//
// Run: npm run verify:navigation

import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom" });
const { flattenRoutes } = await server.ssrLoadModule("/src/lib/siteTree.ts");
const { runCommand } = await server.ssrLoadModule("/src/lib/terminalCommands.ts");
const { matchIntent } = await server.ssrLoadModule("/src/lib/chatIntents.ts");
const { bestGhost, suggest } = await server.ssrLoadModule("/src/lib/suggest.ts");
await server.close();

function fullPath(node) {
  return node.path; // absolute tree path, resolves from cwd "/"
}

const rows = [];
let allGreen = true;

function actionDest(result) {
  if (result.action?.type === "navigate") return { ok: true, dest: result.action.route, type: "navigate" };
  if (result.action?.type === "external") return { ok: true, dest: result.action.href, type: "external" };
  return { ok: false, dest: "(no action)", type: null };
}

for (const node of flattenRoutes()) {
  if (node.path === "/") continue; // root: nothing to "open" from itself
  if (node.path === "/contact") continue; // synthetic grouping, no destination of its own

  // --- Terminal: `open <path>` from root ---
  const result = runCommand("/", `open ${fullPath(node)}`);
  const viaPath = actionDest(result);
  let terminalOk = viaPath.ok && (viaPath.dest === node.route || viaPath.dest === node.href);
  let terminalDest = viaPath.dest;

  // Open by display name from root, as printed by `ls`.
  const byName = actionDest(runCommand("/", `open ${node.name}`));
  const nameOk = byName.ok && (byName.dest === node.route || byName.dest === node.href);
  if (!nameOk) {
    terminalOk = false;
    terminalDest = `name-open FAIL (${byName.dest})`;
  }

  // --- Chat: matchIntent on the node's own name/last segment ---
  const segment = node.path.slice(node.path.lastIndexOf("/") + 1);
  const chatNode = matchIntent(segment);
  const chatOk = chatNode?.path === node.path;

  const ok = terminalOk && chatOk;
  if (!ok) allGreen = false;
  rows.push({
    node: node.path,
    kind: node.kind,
    terminal: terminalOk ? "OK" : `FAIL (${terminalDest})`,
    chat: chatOk ? "OK" : `FAIL (${chatNode?.path ?? "no match"})`,
    dest: node.route ?? node.href,
    verdict: ok ? "green" : "RED",
  });
}

const w = { node: 28, kind: 8, terminal: 26, chat: 26, dest: 45 };
function pad(s, n) {
  return String(s).padEnd(n);
}
console.log(
  pad("node", w.node) + pad("kind", w.kind) + pad("terminal open", w.terminal) + pad("chat match", w.chat) + pad("real destination", w.dest),
);
console.log("-".repeat(w.node + w.kind + w.terminal + w.chat + w.dest));
for (const row of rows) {
  console.log(
    pad(row.node, w.node) + pad(row.kind, w.kind) + pad(row.terminal, w.terminal) + pad(row.chat, w.chat) + pad(row.dest, w.dest),
  );
}

console.log(`\n${rows.length} nodes checked.`);

function fail(label, detail) {
  allGreen = false;
  console.error(`FAIL ${label}: ${detail}`);
}

const cd = runCommand("/", "cd Selected work");
if (cd.cwd !== "/projects" || cd.action?.type !== "navigate" || cd.action.route !== "/explore/projects") {
  fail("cd Selected work", `cwd=${cd.cwd} action=${JSON.stringify(cd.action)}`);
} else console.log("OK cd Selected work -> /projects and /explore/projects");

const lsRoot = runCommand("/", "ls");
if (!lsRoot.lines.includes("Selected work/")) fail("ls folder marker", lsRoot.lines.join(" | "));
else console.log("OK ls marks Selected work/ as a folder");

const lsWork = runCommand("/projects", "ls");
const expected = ["Steadyward", "LV Matching", "Addreach", "Automated Recruitment CRM"];
if (expected.some((name) => !lsWork.lines.includes(name))) {
  fail("ls inside Selected work", lsWork.lines.join(" | "));
} else if (lsWork.lines.some((line) => line.endsWith("/"))) {
  fail("ls files look like folders", lsWork.lines.join(" | "));
} else {
  console.log("OK ls inside Selected work lists four files");
}

const ghost = bestGhost("op", suggest("op", { cwd: "/", history: [] }));
if (ghost !== "open agents") fail("ghost op", ghost);
else console.log("OK op ghosts open agents");

if (!allGreen) {
  console.error("SOME NODES FAILED - see FAIL rows above.");
  process.exit(1);
}
console.log("ALL GREEN: every node opens its real destination through both the terminal's `open` and the chat's keyword match.");

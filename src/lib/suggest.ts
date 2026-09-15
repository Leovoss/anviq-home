// Shared completion / live-filter matcher. Terminal ghost text, the
// mobile chat chip strip, the mobile search capsule, and the desktop
// palette all consume this module - a second copy of the same ranking
// in any of those files is a bug.
//
// Priority: command names (including aliases) -> siteTree paths/names ->
// persisted command history. No invented destinations: every path
// suggestion is a real node from siteTree.ts.

import {
  flattenRoutes,
  listDir,
  nodeTokens,
  type SiteNode,
} from "@/lib/siteTree";

export type SuggestionKind = "command" | "path" | "history";

export interface Suggestion {
  /** Full line the input would become if accepted. */
  value: string;
  kind: SuggestionKind;
  description?: string;
  node?: SiteNode;
}

export const COMMANDS: {
  name: string;
  description: string;
  aliasOf?: string;
}[] = [
  { name: "help", description: "List commands" },
  { name: "ls", description: "List this folder" },
  { name: "cd", description: "Enter a folder" },
  { name: "pwd", description: "Print the current path" },
  { name: "cat", description: "Read a page summary" },
  { name: "open", description: "Open a page or link" },
  { name: "clear", description: "Clear the scrollback" },
  { name: "dir", description: "List this folder", aliasOf: "ls" },
  { name: "type", description: "Read a page summary", aliasOf: "cat" },
  { name: "cls", description: "Clear the scrollback", aliasOf: "clear" },
  { name: "start", description: "Open a page or link", aliasOf: "open" },
];

const PATH_COMMANDS = new Set(["ls", "cd", "cat", "open", "dir", "type", "start"]);
const FOLDER_COMMANDS = new Set(["cd", "ls", "dir"]);
const PROJECT_ORDER = [
  "/projects/agents",
  "/projects/steadyward",
  "/projects/lv-matching",
  "/projects/addreach",
  "/projects/recruitment-crm",
];

const HISTORY_KEY = "anviq-terminal-history";
const HISTORY_CAP = 50;

export function loadCommandHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function pushCommandHistory(command: string): string[] {
  const trimmed = command.trim();
  if (!trimmed) return loadCommandHistory();
  const next = [trimmed, ...loadCommandHistory().filter((item) => item !== trimmed)].slice(
    0,
    HISTORY_CAP,
  );
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Private mode etc.
  }
  return next;
}

/** Word-AND substring match used by the search capsule and palette. */
export function queryWordsMatch(query: string, fields: string[]): boolean {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const hay = fields.join(" ").toLocaleLowerCase();
  return words.every((word) => hay.includes(word));
}

function startsWithInsensitive(value: string, prefix: string): boolean {
  return value.toLowerCase().startsWith(prefix.toLowerCase());
}

function preferredToken(node: SiteNode): string {
  const segment = node.path === "/" ? node.name : node.path.slice(node.path.lastIndexOf("/") + 1);
  return segment;
}

function nodesForCommand(cmd: string, cwd: string): SiteNode[] {
  const local = listDir(cwd) ?? [];
  const all = flattenRoutes().filter((node) => node.path !== "/");
  const seen = new Set<string>();
  const out: SiteNode[] = [];
  const take = (node: SiteNode) => {
    if (seen.has(node.path)) return;
    if (FOLDER_COMMANDS.has(cmd) && node.kind !== "folder") return;
    seen.add(node.path);
    out.push(node);
  };
  // Projects first so `op` ghosts `open steadyward` (Prompt 7 A-1 script).
  for (const path of PROJECT_ORDER) {
    const node = all.find((item) => item.path === path);
    if (node) take(node);
  }
  local.forEach(take);
  all.forEach(take);
  return out;
}

function uniquePush(out: Suggestion[], item: Suggestion) {
  if (out.some((existing) => existing.value.toLowerCase() === item.value.toLowerCase())) return;
  out.push(item);
}

/**
 * Ranked completions for the current input line. Empty input returns the
 * slash-verb list (commands only) so the overlay and the chip strip have
 * a stable idle state; ghost text is suppressed by the caller when empty.
 */
export function suggest(
  input: string,
  ctx: { cwd: string; history: string[] },
): Suggestion[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return COMMANDS.map((command) => ({
      value: command.name,
      kind: "command" as const,
      description: command.description,
    }));
  }
  const out: Suggestion[] = [];

  const slash = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const [rawCmd = "", ...rest] = slash.split(/\s+/);
  const arg = rest.join(" ");
  const hasSep = /\s/.test(slash);
  const cmdMatch = COMMANDS.filter((command) =>
    hasSep ? command.name === rawCmd.toLowerCase() : startsWithInsensitive(command.name, rawCmd),
  );

  // 1. Compound command + path, projects first.
  for (const command of cmdMatch) {
    if (!PATH_COMMANDS.has(command.name)) continue;
    if (hasSep && command.name !== rawCmd.toLowerCase()) continue;
    const prefix = hasSep ? arg : "";
    for (const node of nodesForCommand(command.name, ctx.cwd)) {
      const tokens = [preferredToken(node), ...nodeTokens(node)];
      for (const token of tokens) {
        if (prefix && !startsWithInsensitive(token, prefix) && !startsWithInsensitive(node.name, prefix)) {
          continue;
        }
        if (!prefix && hasSep) {
          // `open ` (trailing space) - still suggest every node.
        } else if (!prefix && !startsWithInsensitive(`${command.name} ${token}`, slash) && slash.length > 0) {
          // `op` should still match `open steadyward`.
          if (!startsWithInsensitive(command.name, rawCmd)) continue;
        }
        uniquePush(out, {
          value: `${command.name} ${token}`,
          kind: "path",
          description: node.summary,
          node,
        });
        break;
      }
    }
  }

  // 2. Bare command names.
  for (const command of COMMANDS) {
    if (hasSep) continue;
    if (rawCmd && !startsWithInsensitive(command.name, rawCmd)) continue;
    uniquePush(out, {
      value: command.name,
      kind: "command",
      description: command.description,
    });
  }

  // 3. Bare path / name tokens (no command typed).
  if (!hasSep) {
    for (const node of nodesForCommand("open", ctx.cwd)) {
      for (const token of [preferredToken(node), ...nodeTokens(node)]) {
        if (slash && !startsWithInsensitive(token, slash) && !startsWithInsensitive(node.name, slash)) {
          continue;
        }
        uniquePush(out, {
          value: token,
          kind: "path",
          description: node.summary,
          node,
        });
        break;
      }
    }
  }

  // 4. Persisted history.
  for (const line of ctx.history) {
    if (trimmed && !startsWithInsensitive(line, trimmed)) continue;
    uniquePush(out, { value: line, kind: "history" });
  }

  return out;
}

/** Best ghost completion: first suggestion that strictly extends `input`. */
export function bestGhost(input: string, suggestions: Suggestion[]): string | null {
  if (!input) return null;
  const hit = suggestions.find(
    (item) =>
      startsWithInsensitive(item.value, input) && item.value.length > input.length,
  );
  return hit?.value ?? null;
}

/** Slash-verb overlay: commands only, live-narrowed by the text after `/`. */
export function slashVerbs(input: string): typeof COMMANDS {
  const filter = input.startsWith("/") ? input.slice(1) : input;
  const q = filter.trim().toLowerCase();
  if (!q) return COMMANDS;
  return COMMANDS.filter(
    (command) =>
      command.name.startsWith(q) || command.description.toLowerCase().includes(q),
  );
}

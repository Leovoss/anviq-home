// Command dispatch for the desktop terminal. This is a navigator over the
// real site, not a shell: every command either reads siteTree data already
// on the page or triggers a client-side route change. No invented output.

import { findNode, listDir, resolvePath, type SiteNode } from "@/lib/siteTree";
import { GREETING_WORDS } from "@/lib/tone";

const GREETING_SET = new Set<string>(GREETING_WORDS);

export type TerminalAction =
  | { type: "navigate"; route: string }
  | { type: "external"; href: string };

export interface TerminalResult {
  /** Lines to print to the scrollback. */
  lines: string[];
  /** The cwd after running this command. */
  cwd: string;
  /** Set when the command should also change the actual page route. */
  action?: TerminalAction;
  /** Set on `clear` - the caller empties the scrollback instead of appending. */
  clear?: boolean;
  /** Cross-platform alias that was typed (`dir`/`type`/`cls`/`start`). */
  usedAlias?: string;
  /** Once-per-visitor commentary key from tone.COMMAND_COMMENTARY. */
  commentary?: "sudo" | "alias" | "clear" | "pwd" | "exit";
  /** First-time unknown verb - surfaces own the twice-rescue line. */
  unknown?: boolean;
  /** A bare greeting word - surfaces answer with tone.GREETING_REPLY. */
  greeting?: boolean;
}

// Cross-platform aliases, mapped 1:1 onto the real verb. No separate shell
// personalities - `dir`, `type`, `cls`, `start` behave exactly like their
// Unix counterparts below.
const ALIASES: Record<string, string> = {
  dir: "ls",
  type: "cat",
  cls: "clear",
  start: "open",
};

// Bare, runnable examples - one per real verb. No descriptions, no flags:
// this is a navigator, not a man page.
export const HELP_LINES = [
  "ls",
  "cd projects",
  "pwd",
  "cat about",
  "open <path>",
  "clear",
];

function formatEntry(node: SiteNode): string {
  return node.kind === "folder" ? `${node.name}/` : node.name;
}

function withAlias(result: TerminalResult, usedAlias?: string): TerminalResult {
  if (!usedAlias) return result;
  return { ...result, usedAlias, commentary: "alias" };
}

export function runCommand(cwd: string, rawInput: string): TerminalResult {
  const input = rawInput.trim();
  if (!input) return { lines: [], cwd };

  const [rawCmd, ...rest] = input.split(/\s+/);
  const typed = rawCmd.toLowerCase();
  const aliased = ALIASES[typed];
  const cmd = aliased ?? typed;
  const arg = rest.join(" ");
  const usedAlias = aliased ? typed : undefined;

  // A bare greeting isn't a real verb, but it is a recognized one - it
  // answers rather than falling through to "unknown: hi - type help".
  if (GREETING_SET.has(cmd)) {
    return withAlias({ lines: [], cwd, greeting: true }, usedAlias);
  }

  switch (cmd) {
    case "help":
      return withAlias({ lines: HELP_LINES, cwd }, usedAlias);

    case "pwd":
      return withAlias({ lines: [cwd], cwd, commentary: "pwd" }, usedAlias);

    case "clear":
      return withAlias({ lines: [], cwd, clear: true, commentary: "clear" }, usedAlias);

    case "ls": {
      const targetPath = arg ? resolvePath(cwd, arg) : cwd;
      if (!targetPath) return withAlias({ lines: [`ls: no such folder: ${arg}`], cwd }, usedAlias);
      const entries = listDir(targetPath);
      if (!entries)
        return withAlias({ lines: [`ls: not a folder: ${arg || targetPath}`], cwd }, usedAlias);
      return withAlias({ lines: entries.map(formatEntry), cwd }, usedAlias);
    }

    case "cd": {
      if (!arg) return withAlias({ lines: [], cwd: "/" }, usedAlias);
      const targetPath = resolvePath(cwd, arg);
      if (!targetPath) return withAlias({ lines: [`cd: no such folder: ${arg}`], cwd }, usedAlias);
      const node = findNode(targetPath);
      if (node?.kind !== "folder")
        return withAlias({ lines: [`cd: not a folder: ${arg}`], cwd }, usedAlias);
      return withAlias(
        {
          lines: [],
          cwd: targetPath,
          // A folder change is a real site navigation, so browser history
          // follows the terminal's cwd when that folder has a route.
          ...(node.route ? { action: { type: "navigate" as const, route: node.route } } : {}),
        },
        usedAlias,
      );
    }

    case "cat": {
      if (!arg) return withAlias({ lines: ["cat: missing path"], cwd }, usedAlias);
      const targetPath = resolvePath(cwd, arg);
      const node = targetPath ? findNode(targetPath) : undefined;
      if (!node) return withAlias({ lines: [`cat: no such file: ${arg}`], cwd }, usedAlias);
      if (node.kind === "folder")
        return withAlias({ lines: [`cat: ${arg} is a folder`], cwd }, usedAlias);
      return withAlias({ lines: [node.summary], cwd }, usedAlias);
    }

    case "open": {
      if (!arg) return withAlias({ lines: ["open: missing path"], cwd }, usedAlias);
      const targetPath = resolvePath(cwd, arg);
      const node = targetPath ? findNode(targetPath) : undefined;
      if (!node) return withAlias({ lines: [`open: no such path: ${arg}`], cwd }, usedAlias);
      if (node.kind === "link" && node.href) {
        return withAlias(
          {
            lines: [`Opening ${node.name} (external)...`],
            cwd,
            action: { type: "external", href: node.href },
          },
          usedAlias,
        );
      }
      if (!node.route) {
        return withAlias({ lines: [`open: ${arg} has no destination`], cwd }, usedAlias);
      }
      return withAlias(
        {
          lines: [`Opening ${node.name}...`],
          cwd,
          action: { type: "navigate", route: node.route },
        },
        usedAlias,
      );
    }

    case "sudo":
      return { lines: [], cwd, commentary: "sudo" };

    case "exit":
    case "quit":
    case "logout":
      return { lines: [], cwd, commentary: "exit" };

    default:
      return { lines: [`unknown: ${rawCmd} - type help`], cwd, unknown: true };
  }
}

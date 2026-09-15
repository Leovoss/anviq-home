# Prompt 7 debug evidence — 2026-09-14

## Provenance

`HANDOFF.md` records **Prompt 7 v3**. It explicitly records **A-0** (`cd Selected work`, folder marker, name-open) and **A-4** (opaque black terminal), but contains no A-5 corner band or typing rule. Typing and corners were therefore unimplemented v4 work; navigation was checked as a claimed A-0 regression.

## Defect 1: navigation

Static call-chain evidence from the actual production functions:

| Step | Observed value |
| --- | --- |
| Input | `cd Selected work` |
| Parser | `cmd="cd"`, `arg="Selected work"` in `runCommand` |
| Resolver | `resolvePath("/", "Selected work") -> "/projects"` |
| Tree node | `{ path: "/projects", kind: "folder", route: "/explore/projects" }` |
| Later input | `open steadyward` from cwd `/projects` |
| Resolver | `resolvePath("/projects", "steadyward") -> "/projects/steadyward"` |
| Tree node/action | `{ kind: "file", route: "/projects/steadyward" }` -> `{ type: "navigate", route: "/projects/steadyward" }` |
| Router | `Terminal.submit` calls React Router `navigate(result.action.route)` |

`npm.cmd run verify:navigation` passed all 20 nodes and the A-0 name/folder cases. `scripts/verify-terminal-owner-repro.mjs` encodes the owner sequence plus URL and browser-history assertions.

Cause: v3 returned only a changed terminal cwd for `cd`, so it never supplied the router action. Folder `cd` now returns the folder's real route as `{ type: "navigate" }`; `cd steadyward` is expected to refuse the file and `open steadyward` is the file-navigation action. The code has no terminal-specific hard-coded site map and no separate desktop resolver.

## Defect 2: typing

Cause: v3 rendered persona strings in static paragraph nodes. `src/components/TypedPersonaLine.tsx` supplies 75 chars/sec visual type, key/pointer completion, reduced-motion completion, and one polite complete-line announcement. Facts and command output remain static.

## Defect 3: corners

Before: `.terminal-window` consumed `--radius-window` = **16px**. After: it consumes `--radius-terminal-window` = **9px**. `.explorer-window` remains **16px**. The terminal has no inner rounded body, and its existing squircle support is retained.

## Browser-artifact status

The local managed Chromium cannot start: its Crashpad/profile directory is denied before Puppeteer receives a page. The regression script now creates an isolated temporary profile and writes `terminal-owner-repro.png` when run in a browser-enabled environment. No video or Terminal.app-reference screenshot is claimed from this constrained runner.

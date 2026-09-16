import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SquareTerminal, X } from "lucide-react";
import { runCommand } from "@/lib/terminalCommands";
import { answerForIntent, findLocalSherlockIntent, intentById, shouldUseSemanticSherlockMatch } from "@/lib/sherlockCorpus";
import { findNode, flattenRoutes, type SiteNode } from "@/lib/siteTree";
import { matchNavigationIntent } from "@/lib/chatIntents";
import { contextQuestion, pageGuide } from "@/lib/sherlockGuide";
import {
  EXAMPLE_HINT,
  hasOnce,
  isEvergreenHint,
  markMetSherlock,
  markOnce,
  recordBookingClick,
  tryPersona,
  useGuide,
} from "@/lib/guide";
import { COMMAND_COMMENTARY, GREETING_REPLY, NODE_OPENER_LINES } from "@/lib/tone";
import { FADE, motionOr } from "@/lib/motion";
import {
  bestGhost,
  loadCommandHistory,
  pushCommandHistory,
  slashVerbs,
  suggest,
} from "@/lib/suggest";
import { setNavigatorSurfaceOpen } from "@/lib/navigatorSurface";
import { SherlockBadge } from "@/components/SherlockBadge";
import { TypedPersonaLine } from "@/components/TypedPersonaLine";

type HistoryEntry = {
  id?: number;
  cwd: string;
  prompt: string;
  lines: string[];
  sherlock?: string;
  personaLines?: string[];
  pending?: boolean;
};

function appendSherlock(entry: HistoryEntry, line: string | undefined): HistoryEntry {
  if (!line) return entry;
  return { ...entry, sherlock: line };
}

function personaFor(id: string, text: string): string | undefined {
  return tryPersona(id) ? text : undefined;
}

function nodeForRoute(pathname: string): SiteNode {
  return flattenRoutes().find((node) => node.route === pathname) ?? findNode("/")!;
}
function contextLines(node: SiteNode, visited: ReadonlySet<string>, journey: readonly string[], visitorMode: ReturnType<typeof useGuide>["visitorMode"]): string[] {
  const guide = pageGuide(node.path, visited, journey, visitorMode);
  const from = guide.previous ? `  from: ${guide.previous.name}` : "";
  return [
    `case: ${guide.node.name}${from}`,
    `brief: ${guide.summary}`,
    `next:  open ${guide.next.path}  # ${guide.reason}`,
  ];
}
function isNavigationRequest(value: string): boolean {
  return /\b(open|show|take|go|browse|navigate|read|visit|book|schedule|meet|call|öffne|zeige|geh)\b/i.test(value);
}

// Opens/navigates the real site from a terminal-shaped affordance. Not a
// shell: every command either reads src/lib/siteTree.ts data already on the
// page or triggers a client-side route change via useNavigate.
export function Terminal() {
  const [open, setOpen] = useState(false);
  const [cwd, setCwd] = useState("/");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadCommandHistory(),
  );
  const [cycleIndex, setCycleIndex] = useState(0);
  const [slashIndex, setSlashIndex] = useState(0);
  const helpCount = useRef(0);
  const emptyCount = useRef(0);
  const unmatchedCount = useRef(0);
  const injectedHint = useRef<string | null>(null);
  const cycleList = useRef<ReturnType<typeof suggest>>([]);
  const questionRequest = useRef(0);
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const guide = useGuide(open);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const inputId = `${titleId}-input`;
  const currentNode = nodeForRoute(location.pathname);
  const lastContextPath = useRef<string | null>(null);

  const slashMode = input.startsWith("/") && !input.includes(" ");
  const slashItems = slashMode ? slashVerbs(input) : [];
  const suggestions = suggest(slashMode ? input.slice(1) : input, {
    cwd,
    history: cmdHistory,
  });
  const cyclePool = cycleList.current.length ? cycleList.current : suggestions;
  const ghostSource = slashMode
    ? null
    : cyclePool.length
      ? cyclePool[(cycleIndex % cyclePool.length + cyclePool.length) % cyclePool.length]
      : undefined;
  const ghost =
    input && ghostSource
      ? bestGhost(input, [ghostSource, ...suggestions.filter((item) => item !== ghostSource)])
      : bestGhost(input, suggestions);
  const extraRow =
    Boolean(input.trim()) && !slashMode && suggestions.length > 3
      ? suggestions.slice(0, 8)
      : [];

  const openTerminal = () => {
    window.dispatchEvent(new Event("anviq:navigator-open"));
    setNavigatorSurfaceOpen(true);
    markMetSherlock();
    markOnce("sherlock-invite-seen");
    setOpen(true);
    const context = contextLines(currentNode, guide.visited, guide.journey, guide.visitorMode);
    const opening: HistoryEntry[] = [{ cwd, prompt: "", lines: context }];
    lastContextPath.current = currentNode.path;
    setHistory(opening);
  };
  const closeTerminal = () => {
    setNavigatorSurfaceOpen(false);
    guide.close();
    setOpen(false);
    setInput("");
    triggerRef.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      event.preventDefault();
      closeTerminal();
    };
    const onFocusInput = () => inputRef.current?.focus();
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("anviq:focus-navigator-input", onFocusInput);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("anviq:focus-navigator-input", onFocusInput);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the terminal's mental model in step with navigation from anywhere
  // on the site, not only navigation initiated in the terminal itself.
  useEffect(() => {
    if (!open || lastContextPath.current === currentNode.path) return;
    lastContextPath.current = currentNode.path;
    setHistory((prev) => [...prev, { cwd, prompt: "", lines: contextLines(currentNode, guide.visited, guide.journey, guide.visitorMode) }]);
  }, [open, currentNode, cwd, guide.visited, guide.journey, guide.visitorMode]);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [history]);

  useEffect(() => {
    if (!open) return;
    const onLightboxOpen = () => closeTerminal();
    window.addEventListener("anviq:lightbox-open", onLightboxOpen);
    return () => window.removeEventListener("anviq:lightbox-open", onLightboxOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Persona hints that fire while the surface is open (R-s, idle, events)
  // land in the transcript next to their trigger, never as a free-floating
  // trivia line. Evergreen "Not yet seen" stays in the banner.
  useEffect(() => {
    if (!open || !guide.hint || isEvergreenHint(guide.hint)) return;
    if (injectedHint.current === guide.hint) return;
    injectedHint.current = guide.hint;
    setHistory((prev) => {
      if (prev.some((entry) => entry.sherlock === guide.hint && !entry.prompt)) return prev;
      return [...prev, { cwd, prompt: "", lines: [], sherlock: guide.hint ?? undefined }];
    });
    guide.dismiss();
    // Copied into the transcript first, then committed, so the line is
    // visible before the one-time flag clears it from hint state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guide.hint, cwd]);

  const acceptGhost = () => {
    const value = ghostSource?.value ?? ghost;
    if (!value) return;
    setInput(value);
    setCycleIndex(0);
    cycleList.current = [];
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (slashMode && slashItems.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashIndex((index) => (index + 1) % slashItems.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashIndex((index) => (index - 1 + slashItems.length) % slashItems.length);
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const next = slashItems[(slashIndex + (event.shiftKey ? -1 : 1) + slashItems.length) % slashItems.length];
        setSlashIndex(
          (slashIndex + (event.shiftKey ? -1 : 1) + slashItems.length) % slashItems.length,
        );
        setInput(`/${next.name}`);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setInput("");
        return;
      }
    }

    if (event.key === "Tab" && (cycleList.current.length || suggestions.length)) {
      event.preventDefault();
      if (!cycleList.current.length) cycleList.current = suggestions;
      const list = cycleList.current;
      const current = list[cycleIndex]?.value ?? "";
      const already = current.toLowerCase() === input.toLowerCase();
      const delta = event.shiftKey ? -1 : 1;
      const nextIndex = already
        ? (cycleIndex + delta + list.length) % list.length
        : cycleIndex;
      setCycleIndex(nextIndex);
      setInput(list[nextIndex].value);
      return;
    }
    if (event.key === "ArrowRight") {
      const el = event.currentTarget;
      const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
      if (atEnd && ghost) {
        event.preventDefault();
        acceptGhost();
      }
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const stripped = input.startsWith("/") ? input.slice(1) : input;
    const command =
      slashMode && slashItems[slashIndex] ? slashItems[slashIndex].name : stripped;

    if (!command.trim()) {
      emptyCount.current += 1;
      setInput("");
      if (emptyCount.current === 3) {
        const line = personaFor("cmd-whitespace", COMMAND_COMMENTARY.whitespace);
        if (line) {
          setHistory((prev) => [...prev, { cwd, prompt: "", lines: [], sherlock: line }]);
        }
      }
      return;
    }
    emptyCount.current = 0;
    setInput("");
    setCycleIndex(0);
    setSlashIndex(0);
    cycleList.current = [];
    setCmdHistory(pushCommandHistory(command));
    if (!slashMode) guide.noteSherlockQuestion(command);

    if (!slashMode && contextQuestion(command)) {
      setHistory((prev) => [
        ...prev,
        { cwd, prompt: command, lines: contextLines(currentNode, guide.visited, guide.journey, guide.visitorMode) },
      ]);
      return;
    }

    // Natural language navigation shares the real site tree with the mobile
    // navigator. It is deliberately handled before Q&A so "show services"
    // acts, instead of merely describing Services.
    const requestedNode = !slashMode && isNavigationRequest(command) ? matchNavigationIntent(command) : undefined;
    if (requestedNode) {
      setHistory((prev) => [
        ...prev,
        { cwd, prompt: command, lines: [`Opening ${requestedNode.name}.`] },
      ]);
      if (requestedNode.route) {
        navigate(requestedNode.route);
      } else if (requestedNode.href) {
        if (requestedNode.href.includes("calendly.com")) recordBookingClick();
        window.open(requestedNode.href, "_blank", "noopener,noreferrer");
      }
      return;
    }

    // Shell verbs keep their terminal behaviour. Ordinary questions use the
    // same authored corpus and semantic fallback as the mobile Sherlock.
    const localIntent = !slashMode ? findLocalSherlockIntent(command) : undefined;
    if (localIntent) {
      unmatchedCount.current = 0;
      setHistory((prev) => [
        ...prev,
        { cwd, prompt: command, lines: [], sherlock: answerForIntent(localIntent, command) },
      ]);
      return;
    }
    const naturalQuestion = !slashMode && (/\s/.test(command) || command.includes("?"));
    if (naturalQuestion && shouldUseSemanticSherlockMatch(command)) {
      const request = ++questionRequest.current;
      setHistory((prev) => [...prev, { id: request, cwd, prompt: command, lines: [], pending: true }]);
      try {
        const response = await fetch("/api/sherlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: command }),
        });
        const result = (await response.json()) as { intent?: string };
        const intent = result.intent ? intentById(result.intent) : undefined;
        if (request === questionRequest.current) {
          const resolved = intent ?? intentById("fallback")!;
          setHistory((prev) => prev.map((entry) => entry.id === request
            ? { ...entry, pending: false, sherlock: answerForIntent(resolved, command) }
            : entry));
        }
      } catch {
        if (request === questionRequest.current) {
          setHistory((prev) => prev.map((entry) => entry.id === request
            ? { ...entry, pending: false, sherlock: answerForIntent(intentById("fallback")!, command) }
            : entry));
        }
      }
      return;
    }
    if (naturalQuestion) {
      setHistory((prev) => [
        ...prev,
        { cwd, prompt: command, lines: [], sherlock: answerForIntent(intentById("fallback")!, command) },
      ]);
      return;
    }

    const result = runCommand(cwd, command);
    setCwd(result.cwd);
    const lines = [...result.lines];
    const personaLines: string[] = [];
    if (result.action?.type === "navigate") {
      const opener = NODE_OPENER_LINES[result.action.route];
      const onceId = `opener:${result.action.route}`;
      if (opener && !hasOnce(onceId)) {
        personaLines.push(opener);
        markOnce(onceId);
      }
    }

    let sherlock: string | undefined;
    if (command.trim().split(/\s+/)[0]?.toLowerCase() === "help") {
      helpCount.current += 1;
      if (helpCount.current === 2) {
        sherlock = personaFor("cmd-help-twice", COMMAND_COMMENTARY.helpTwice);
      }
    }
    if (result.commentary && !sherlock) {
      const text = COMMAND_COMMENTARY[result.commentary];
      sherlock = personaFor(`cmd-${result.commentary}`, text);
    }
    if (result.greeting) {
      sherlock = GREETING_REPLY;
    }
    if (result.unknown) {
      unmatchedCount.current += 1;
      if (unmatchedCount.current >= 2) {
        sherlock = personaFor("cmd-unknown-rescue", EXAMPLE_HINT) ?? sherlock;
      }
    }

    if (result.clear) {
      setHistory(sherlock ? [{ cwd: result.cwd, prompt: command, lines: [], sherlock }] : []);
    } else {
      setHistory((prev) => [
        ...prev,
        { ...appendSherlock({ cwd, prompt: command, lines }, sherlock), personaLines },
      ]);
    }

    if (result.action?.type === "navigate") {
      navigate(result.action.route);
    } else if (result.action?.type === "external") {
      if (result.action.href.includes("calendly.com")) recordBookingClick();
      window.open(result.action.href, "_blank", "noopener,noreferrer");
    }
  };

  const triggerLabel = !open && guide.badge.count > 0 ? guide.badge.name : "Open terminal";

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="terminal-trigger"
        aria-label={triggerLabel}
        onClick={openTerminal}
      >
        <SquareTerminal size={19} aria-hidden="true" />
        {!hasOnce("sherlock-invite-seen") && <span className="sherlock-invite" aria-hidden="true">Need a guide?</span>}
        <SherlockBadge badge={guide.badge} open={open} />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="terminal-backdrop"
              onClick={closeTerminal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionOr(reducedMotion, FADE)}
            >
              <motion.section
                aria-labelledby={titleId}
                className="terminal-window"
                onClick={(event) => event.stopPropagation()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={motionOr(reducedMotion, FADE)}
              >
                <div className="terminal-titlebar hairline-b">
                  <div className="terminal-window-controls">
                    <button type="button" className="terminal-close" aria-label="Close terminal" onClick={closeTerminal}>
                      <X size={10} aria-hidden="true" />
                    </button>
                    <span className="terminal-control-yellow" aria-hidden="true" />
                    <span className="terminal-control-green" aria-hidden="true" />
                  </div>
                  <div className="terminal-titlebar-copy"><span id={titleId}>Sherlock — Anviq</span></div>
                </div>
                <div
                  className="terminal-output"
                  ref={outputRef}
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {history.map((entry, index) => (
                    <div className="terminal-entry" key={index}>
                      {entry.prompt && (
                        <p className="terminal-line terminal-prompt">
                          <span aria-hidden="true">{entry.cwd}$</span> {entry.prompt}
                        </p>
                      )}
                      {entry.lines.map((line, lineIndex) => (
                        <p className="terminal-line" key={lineIndex}>
                          {line}
                        </p>
                      ))}
                      {entry.personaLines?.map((line, lineIndex) => (
                        <p className="terminal-line terminal-sherlock" key={`persona-${lineIndex}`}>
                          <span aria-hidden="true">›</span> <TypedPersonaLine text={line} reducedMotion={reducedMotion} />
                        </p>
                      ))}
                      {entry.sherlock && (
                        <p className="terminal-line terminal-sherlock">
                          <span aria-hidden="true">›</span> <TypedPersonaLine text={entry.sherlock} reducedMotion={reducedMotion} />
                        </p>
                      )}
                      {entry.pending && (
                        <p className="terminal-line terminal-thinking" aria-label="Sherlock is consulting the case file">
                          <span aria-hidden="true">Sherlock is consulting the case file</span><span className="terminal-thinking-dots" aria-hidden="true" />
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {slashMode && slashItems.length > 0 && (
                  <ul className="terminal-slash" role="listbox" aria-label="Commands">
                    {slashItems.map((item, index) => (
                      <li
                        key={item.name}
                        className={index === slashIndex ? "is-active" : ""}
                        role="option"
                        aria-selected={index === slashIndex}
                      >
                        <span>/{item.name}</span>
                        <small>{item.description}</small>
                      </li>
                    ))}
                  </ul>
                )}
                {extraRow.length > 0 && (
                  <p className="terminal-suggest-row" aria-hidden="true">
                    {extraRow.map((item) => item.value).join("  ·  ")}
                  </p>
                )}
                <form className="terminal-form" onSubmit={submit}>
                  <label htmlFor={inputId} className="sr-only">
                    Terminal command
                  </label>
                  <span aria-hidden="true">{cwd}$</span>
                  <div className="terminal-input-wrap">
                    {ghost && ghost.toLowerCase().startsWith(input.toLowerCase()) && (
                      <span className="terminal-ghost" aria-hidden="true">
                        <span className="terminal-ghost-typed">{input}</span>
                        <span className="terminal-ghost-rest">{ghost.slice(input.length)}</span>
                      </span>
                    )}
                    <input
                      id={inputId}
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(event) => {
                        setInput(event.target.value);
                        setCycleIndex(0);
                        setSlashIndex(0);
                        cycleList.current = [];
                      }}
                      onKeyDown={onInputKeyDown}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  </div>
                </form>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

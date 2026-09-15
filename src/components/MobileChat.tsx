import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Compass, X } from "lucide-react";
import type { SiteNode } from "@/lib/siteTree";
import { matchIntent } from "@/lib/chatIntents";
import {
  EXAMPLE_HINT,
  getBadgeGreeting,
  hasOnce,
  isEvergreenHint,
  markMetSherlock,
  markOnce,
  recordBookingClick,
  tryPersona,
  useGuide,
} from "@/lib/guide";
import { GREETING_LINES, GREETING_REPLY, GREETING_WORDS, NODE_OPENER_LINES } from "@/lib/tone";
import { FADE, motionOr, SPRING_MORPH } from "@/lib/motion";
import { pushCommandHistory } from "@/lib/suggest";
import { setNavigatorSurfaceOpen } from "@/lib/navigatorSurface";
import { SherlockBadge } from "@/components/SherlockBadge";
import { TypedPersonaLine } from "@/components/TypedPersonaLine";

// What's shown above the bar right now - one answer at a time, replaced by
// the next question, not an accumulating transcript. "query" is the small
// tag echoing what was asked; everything else is the same shape a node's
// reply always had (text/persona/node/children).
interface Answer {
  query?: string;
  text?: string;
  persona?: string;
  node?: SiteNode;
  children?: SiteNode[];
}

// A bare "hi"/"hey" isn't a page query, but the generic unmatched-fallback
// line read as dead persona for exactly the words a real assistant should
// have an answer for. No NLP, same deterministic-keyword spirit as
// chatIntents.ts - a fixed word list, not sentiment/intent detection. Same
// list the desktop terminal checks, so both surfaces recognize the same
// greetings.
const GREETING_WORD_SET = new Set<string>(GREETING_WORDS);
function isGreeting(query: string): boolean {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((word) => GREETING_WORD_SET.has(word));
}

// Deterministic navigator over the real site, presented as a single
// always-visible search bar (Siri/Spotlight shaped): one field, nothing
// above it until you ask something, then the answer appears above the bar
// and gets replaced by the next question. Same siteTree/matchIntent data
// the desktop terminal uses - no separate content, no personality, no
// invented copy.
export function MobileChat() {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [input, setInput] = useState("");
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const guide = useGuide(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const unmatchedCount = useRef(0);
  const injectedHint = useRef<string | null>(null);
  // Pure bar until a real question has been asked - hints/evergreen
  // suggestions are a genuine "magically above" moment, but only once
  // there's been a first ask, never just from focusing the bar.
  const hasAsked = useRef(false);
  const titleId = useId();
  const inputId = `${titleId}-input`;

  // R-n: once per visitor, folded into the reply itself so it's visible
  // before the separate, deliberate tap that navigates - no artificial
  // delay, just an extra line for these nodes.
  const openerFor = (node: SiteNode): string | undefined => {
    if (!node.route) return undefined;
    const onceId = `opener:${node.route}`;
    const line = NODE_OPENER_LINES[node.route];
    if (!line || hasOnce(onceId)) return undefined;
    markOnce(onceId);
    return line;
  };

  // R-0, folded in the same way: the once-per-visitor greeting used to be
  // its own message shown the moment the surface opened. In the
  // single-bar model nothing shows until an actual question is asked, so
  // it rides along with that first answer instead of appearing before it.
  const introFor = (): string | undefined => {
    if (guide.badge.count > 0 && !hasOnce("badge-greeting") && tryPersona("badge-greeting")) {
      return getBadgeGreeting();
    }
    if (!hasOnce("greeting")) {
      markOnce("greeting");
      return GREETING_LINES.join("\n");
    }
    return undefined;
  };

  const nodeReply = (node: SiteNode, query: string): Answer => ({
    query,
    text: node.summary,
    persona: introFor() ?? openerFor(node),
    node,
    children: node.kind === "folder" ? node.children : undefined,
  });

  // A pending, unshown R-n line means this leaf deserves a reply first;
  // otherwise a leaf chip opens straight away, same as any other page.
  const hasPendingOpener = (node: SiteNode) =>
    !!node.route && !!NODE_OPENER_LINES[node.route] && !hasOnce(`opener:${node.route}`);

  const askNode = (label: string, node: SiteNode) => {
    hasAsked.current = true;
    setAnswer(nodeReply(node, label));
  };

  const engage = () => {
    if (open) return;
    window.dispatchEvent(new Event("anviq:navigator-open"));
    setNavigatorSurfaceOpen(true);
    markMetSherlock();
    setOpen(true);
  };

  const dismiss = () => {
    setNavigatorSurfaceOpen(false);
    guide.close();
    setOpen(false);
    setAnswer(null);
    inputRef.current?.blur();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    pushCommandHistory(text);
    hasAsked.current = true;
    const node = matchIntent(text);
    if (node) {
      unmatchedCount.current = 0;
      setAnswer(nodeReply(node, text));
    } else if (isGreeting(text)) {
      setAnswer({ query: text, persona: introFor() ?? GREETING_REPLY });
    } else {
      unmatchedCount.current += 1;
      const rescue =
        unmatchedCount.current >= 2 && tryPersona("cmd-unknown-rescue") ? EXAMPLE_HINT : undefined;
      setAnswer({
        query: text,
        text: "Not sure what that maps to - try a page name, e.g. services, projects, about.",
        persona: introFor() ?? rescue,
      });
    }
  };

  const openPage = (node: SiteNode) => {
    if (node.kind === "link" && node.href) {
      if (node.href.includes("calendly.com")) recordBookingClick();
      window.open(node.href, "_blank", "noopener,noreferrer");
    } else if (node.route) {
      navigate(node.route);
    }
    dismiss();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // HIG 3.2: never stack over the site's screenshot lightbox.
  useEffect(() => {
    if (!open) return;
    const onLightboxOpen = () => dismiss();
    window.addEventListener("anviq:lightbox-open", onLightboxOpen);
    return () => window.removeEventListener("anviq:lightbox-open", onLightboxOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Non-evergreen hints (R-s commentary, idle, R-e events) interrupt with
  // their own one-time line, same priority guide.ts already computes;
  // committed via guide.dismiss() so they don't reappear. Evergreen
  // ("Not yet seen: X.") is handled separately below - it's a standing
  // ambient suggestion, not a one-shot interruption.
  useEffect(() => {
    if (!open || !hasAsked.current || !guide.hint || isEvergreenHint(guide.hint)) return;
    if (injectedHint.current === guide.hint) return;
    injectedHint.current = guide.hint;
    setAnswer({ text: guide.hint });
    guide.dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guide.hint]);

  // The current question's answer always wins; the evergreen progression
  // line is the ambient fallback shown in the same slot once there's
  // nothing more pressing to say - dismissing it (guide.dismiss) just
  // hides that specific suggestion, same as before.
  const evergreen =
    !answer && open && hasAsked.current && guide.hint && isEvergreenHint(guide.hint) ? guide.hint : null;
  const panel = answer ?? (evergreen ? { text: evergreen } : null);
  const badgeName = guide.badge.count > 0 ? guide.badge.name : undefined;

  return (
    <>
      {createPortal(
        <>
          <AnimatePresence>
            {open && (
              <motion.div
                key="edge-tint"
                className="chat-edge-tint"
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={motionOr(reducedMotion, FADE)}
              />
            )}
          </AnimatePresence>
          <div className="chat-bar-anchor">
            <AnimatePresence>
              {panel && (
                <motion.div
                  key={answer ? (answer.query ?? answer.text ?? "answer") : "evergreen"}
                  className="chat-answer"
                  role="status"
                  aria-live="polite"
                  initial={reducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
                  transition={motionOr(reducedMotion, SPRING_MORPH)}
                >
                  <button
                    type="button"
                    className="icon-button chat-answer-dismiss"
                    aria-label="Close Sherlock"
                    onClick={dismiss}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                  {answer?.query && <p className="chat-answer-query">{answer.query}</p>}
                  {panel.text && <p>{panel.text}</p>}
                  {panel === answer && answer?.persona && (
                    <p className="chat-persona">
                      <span aria-hidden="true">›</span>{" "}
                      <TypedPersonaLine text={answer.persona} reducedMotion={reducedMotion} />
                    </p>
                  )}
                  {answer?.node && (
                    <button type="button" className="chat-open-button" onClick={() => openPage(answer.node!)}>
                      Open {answer.node.name}
                    </button>
                  )}
                  {answer?.children && (
                    <div className="chat-chip-row">
                      {answer.children.map((child) =>
                        child.kind === "folder" || hasPendingOpener(child) ? (
                          <button
                            key={child.path}
                            type="button"
                            className="chat-chip"
                            onClick={() => askNode(child.name, child)}
                          >
                            {child.name}
                          </button>
                        ) : (
                          <button key={child.path} type="button" className="chat-chip" onClick={() => openPage(child)}>
                            {child.name}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <form className="chat-bar" onSubmit={submit}>
              <span className="chat-bar-mark">
                <Compass size={20} aria-hidden="true" />
                <SherlockBadge badge={guide.badge} open={open} />
              </span>
              <label htmlFor={inputId} className="sr-only">
                {badgeName ?? "Ask Sherlock about a page, e.g. services, projects, about"}
              </label>
              <input
                id={inputId}
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onFocus={engage}
                placeholder="Ask Sherlock…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {input.trim() && (
                <button type="submit" className="chat-send" aria-label="Ask">
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
              )}
            </form>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

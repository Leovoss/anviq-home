import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import type { ReactNode } from "react";

// Same spring shape as the GitHub activity widget's SPRING constant, so
// motion feels consistent site-wide. No bounce: content swaps should settle
// decisively, not oscillate.
const ENTER = { type: "spring", bounce: 0, duration: 0.32 } as const;
// Old content disappears essentially instantly rather than lingering through
// a visible fade - the toolbar/breadcrumb switches to the new section
// immediately, so a slower exit left stale content on screen under a label
// that no longer matched it.
const EXIT = { duration: 0.05, ease: "linear" } as const;

// Runs once per pane mount, after the new content is actually in the DOM -
// used to fire scroll/focus handling at the right time regardless of how
// AnimatePresence is sequencing the exit/enter (mode="wait" delays mounting
// the new pane until the old one has finished exiting).
function PaneMountEffect({ onMount }: { onMount?: () => void }) {
  useEffect(() => {
    onMount?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function ExplorerPane({
  animKey,
  onEnter,
  children,
}: {
  animKey: string;
  onEnter?: () => void;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={animKey}
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: reducedMotion ? { duration: 0 } : ENTER,
        }}
        exit={{
          opacity: reducedMotion ? 1 : 0,
          y: reducedMotion ? 0 : -6,
          transition: reducedMotion ? { duration: 0 } : EXIT,
        }}
      >
        <PaneMountEffect onMount={onEnter} />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

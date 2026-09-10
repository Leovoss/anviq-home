import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Same spring shape as the GitHub activity widget's SPRING constant, so
// motion feels consistent site-wide. No bounce: content swaps should settle
// decisively, not oscillate.
const ENTER = { type: "spring", bounce: 0, duration: 0.32 } as const;
const EXIT = { duration: 0.15, ease: "easeIn" } as const;

export function ExplorerPane({
  animKey,
  children,
}: {
  animKey: string;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
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
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

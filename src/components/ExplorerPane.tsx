import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

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
          transition: reducedMotion
            ? { duration: 0 }
            : { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
        }}
        exit={{
          opacity: reducedMotion ? 1 : 0,
          y: reducedMotion ? 0 : -6,
          transition: reducedMotion
            ? { duration: 0 }
            : { duration: 0.15, ease: [0.4, 0, 1, 1] },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { BOARD_ENTER, BOARD_EXIT, motionOr } from "@/lib/motion";

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
          transition: motionOr(reducedMotion, BOARD_ENTER),
        }}
        exit={{
          opacity: reducedMotion ? 1 : 0,
          y: reducedMotion ? 0 : -6,
          transition: motionOr(reducedMotion, BOARD_EXIT),
        }}
      >
        <PaneMountEffect onMount={onEnter} />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

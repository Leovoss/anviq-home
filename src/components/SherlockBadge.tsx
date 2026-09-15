import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { hasOnce, markOnce, type BadgeState } from "@/lib/guide";

const POP_ONCE = "badge-pop";
const LIVE_DEBOUNCE_MS = 400;

export function SherlockBadge({
  badge,
  open,
}: {
  badge: BadgeState;
  open: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const count = open ? 0 : badge.count;
  const [spent, setSpent] = useState(() => hasOnce(POP_ONCE));
  const [announcement, setAnnouncement] = useState("");
  const last = useRef<number | null>(null);
  const pop = count > 0 && !spent && !reducedMotion;

  useEffect(() => {
    if (last.current === null && count === 0) {
      last.current = 0;
      return;
    }
    if (last.current === count) return;
    last.current = count;
    const text =
      count === 0 ? "Sherlock, no pending suggestions" : badge.name;
    const id = window.setTimeout(() => setAnnouncement(text), LIVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [count, badge.name]);

  return (
    <>
      {count > 0 && (
        <span
          className={`sherlock-badge${pop ? " sherlock-badge-pop" : ""}`}
          aria-hidden="true"
          onAnimationEnd={() => {
            markOnce(POP_ONCE);
            setSpent(true);
          }}
        >
          {count}
        </span>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}

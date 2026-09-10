import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

const BACKDROP_TRANSITION = { duration: 0.18 } as const;
const DIALOG_SPRING = { type: "spring", bounce: 0, duration: 0.32 } as const;

export function ScreenshotLightbox({
  src,
  alt,
  label,
}: {
  src: string;
  alt: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const focusable = dialog
      ? [
          ...dialog.querySelectorAll<HTMLElement>(
            'button, [href], [tabindex]:not([tabindex="-1"])',
          ),
        ]
      : [];
    focusable[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="project-screenshot-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <img className="project-screenshot" src={src} alt={alt} loading="lazy" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="lightbox-backdrop"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : BACKDROP_TRANSITION}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className="lightbox-dialog"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
              transition={reducedMotion ? { duration: 0 } : DIALOG_SPRING}
            >
              <button
                type="button"
                className="lightbox-close"
                onClick={() => setOpen(false)}
                aria-label="Close screenshot"
              >
                <X size={20} aria-hidden="true" />
              </button>
              <img src={src} alt={alt} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

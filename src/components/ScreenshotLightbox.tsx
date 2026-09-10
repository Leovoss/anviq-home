import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

const BACKDROP_TRANSITION = { duration: 0.18 } as const;
const QUICK_LOOK_SPRING = { type: "spring", bounce: 0.1, duration: 0.42 } as const;

// iOS/macOS Quick Look: tap the thumbnail and it grows in place into a large
// preview (shared layoutId on the <img> itself does the morph), instead of a
// generic lightbox fading in over it. Works the same on touch as on desktop.
export function ScreenshotLightbox({
  src,
  alt,
  label,
  layoutId,
}: {
  src: string;
  alt: string;
  label: string;
  layoutId: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === " ") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
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
        <motion.img
          layoutId={`screenshot-${layoutId}`}
          className="project-screenshot"
          style={{ opacity: open ? 0 : 1 }}
          src={src}
          alt={alt}
          loading="lazy"
          transition={reducedMotion ? { duration: 0 } : QUICK_LOOK_SPRING}
        />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="quicklook-backdrop"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : BACKDROP_TRANSITION}
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                className="quicklook-dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <motion.img
                  layoutId={`screenshot-${layoutId}`}
                  src={src}
                  alt={alt}
                  transition={reducedMotion ? { duration: 0 } : QUICK_LOOK_SPRING}
                />
                <button
                  type="button"
                  className="quicklook-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close preview"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

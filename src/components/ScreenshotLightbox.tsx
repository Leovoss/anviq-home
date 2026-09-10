import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

const BACKDROP_TRANSITION = { duration: 0.18 } as const;
const QUICK_LOOK_SPRING = { type: "spring", bounce: 0.1, duration: 0.42 } as const;

type PreviewProps = {
  src: string;
  alt: string;
  label: string;
  layoutId: string;
  /** Desktop expands the shot in place, Finder-style. Touch shells get the
   * full-screen Quick Look overlay instead. */
  inline?: boolean;
};

// Finder shows a preview inside the window rather than throwing an overlay
// over everything: clicking the shot grows it to the width of the project
// pane and back.
function InlinePreview({ src, alt, label }: Omit<PreviewProps, "layoutId">) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion ? { duration: 0 } : QUICK_LOOK_SPRING;
  return (
    <motion.figure
      layout
      transition={transition}
      className={`screenshot-preview ${open ? "is-open" : ""}`}
    >
      <button
        type="button"
        className="project-screenshot-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
      >
        <motion.img
          layout
          transition={transition}
          className="project-screenshot"
          src={src}
          alt={alt}
          loading="lazy"
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.figcaption
            className="screenshot-preview-bar"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_TRANSITION}
          >
            <span>{label}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse preview"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </motion.figcaption>
        )}
      </AnimatePresence>
    </motion.figure>
  );
}

function OverlayQuickLook({ src, alt, label, layoutId }: PreviewProps) {
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
              <button
                type="button"
                className="quicklook-close"
                onClick={() => setOpen(false)}
                aria-label="Close preview"
              >
                <X size={18} aria-hidden="true" />
              </button>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export function ScreenshotLightbox({ inline, ...props }: PreviewProps) {
  return inline ? <InlinePreview {...props} /> : <OverlayQuickLook {...props} inline={inline} />;
}

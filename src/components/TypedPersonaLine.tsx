import { useEffect, useState, type CSSProperties } from "react";

/** A visual-only typewriter; assistive technology receives one complete line. */
export function TypedPersonaLine({ text, reducedMotion }: { text: string; reducedMotion: boolean | null }) {
  const [complete, setComplete] = useState(reducedMotion ?? false);

  useEffect(() => {
    setComplete(Boolean(reducedMotion));
    if (reducedMotion) return;
    const finish = () => setComplete(true);
    window.addEventListener("keydown", finish, { once: true });
    window.addEventListener("pointerdown", finish, { once: true });
    return () => {
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
    };
  }, [reducedMotion, text]);

  return (
    <>
      <span aria-hidden="true" className={complete ? "persona-text" : "persona-text is-typing"}>
        {complete ? text : <span className="persona-typewriter" style={{ "--persona-steps": text.length } as CSSProperties}>{text}</span>}
      </span>
      <span className="sr-only" aria-live="polite">{text}</span>
    </>
  );
}

// Single source of truth for navigator + board transition timing. Every
// duration/easing used by the terminal, the mobile chat sheet, the
// screenshot lightbox, the board's pane transitions, and the folder-morph
// animations comes from here - no scattered literals in those files.
//
// Explicitly NOT in scope (per the A1b scope guard): the desktop
// CommandPalette's own PALETTE_FADE in src/pages/Home.tsx. That's existing
// desktop search chrome and stays exactly as it is - untouched, not even
// repointed at these tokens.
//
// Three families, chosen to cover what's actually on screen rather than
// invented for their own sake:
//   FADE          - simple opacity transitions (backdrops, dialogs)
//   SPRING_MORPH  - playful, slightly bouncy settle (folder art morphing
//                   into a preview, the quicklook image, the chat sheet
//                   sliding up) - the same shape whether opening or
//                   dismissing, per A1's "spring config consistent across
//                   open/dismiss"
//   BOARD_ENTER   - content-pane swaps and the About nav pill: settles
//                   decisively, no bounce, distinct from SPRING_MORPH
//                   because these are structural swaps, not playful ones
//
// BOARD_EXIT is a deliberate exception to the 180-400ms band: the old
// pane needs to clear near-instantly so the toolbar/breadcrumb (which
// switches immediately) never shows a label next to stale content from
// the section that just left. A slower exit here is a real regression,
// not a style nit - see ExplorerPane.tsx's own note.

export const FADE = { duration: 0.18 } as const;

export const SPRING_MORPH = { type: "spring", bounce: 0.1, duration: 0.38 } as const;

export const BOARD_ENTER = { type: "spring", bounce: 0, duration: 0.32 } as const;
export const BOARD_EXIT = { duration: 0.05, ease: "linear" } as const;

export const INSTANT = { duration: 0 } as const;

/** `reducedMotion ? INSTANT : transition` - the one pattern used everywhere.
 *  Takes `boolean | null` directly - motion/react's useReducedMotion()
 *  returns null before the media query has resolved on first render. */
export function motionOr<T>(reducedMotion: boolean | null, transition: T) {
  return reducedMotion ? INSTANT : transition;
}

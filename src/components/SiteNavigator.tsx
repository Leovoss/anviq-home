import { useSyncExternalStore } from "react";
import { Terminal } from "@/components/Terminal";
import { MobileChat } from "@/components/MobileChat";

// Keep the terminal for true desktop workspaces. A 1024px iPad viewport is
// tablet-sized even when it has a pointer, so it should receive Sherlock's
// compact chat surface instead of the full terminal window.
const QUERY = "(min-width: 1200px)";
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

// One dispatcher, one breakpoint check: desktop gets the terminal, mobile
// gets the chat, never both. This used to be two independent conditions
// spread across Home.tsx (a real bug once - see git history); a single
// ternary on one boolean makes "both" or "neither" structurally
// impossible rather than something to remember to keep in sync.
export function SiteNavigator() {
  const desktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return desktop ? <Terminal /> : <MobileChat />;
}

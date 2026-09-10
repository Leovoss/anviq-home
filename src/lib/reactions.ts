// Anonymous click counter - no IP, no cookies, no per-user identity, just
// an integer per emoji tallied in the worker's KV store.
export function sendReaction(name: string) {
  fetch("/api/reactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji: name }),
  }).catch(() => {});
}

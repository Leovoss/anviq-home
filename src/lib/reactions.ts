// Anonymous click counter - no IP, no cookies, no per-user identity, just
// an integer per emoji tallied in the worker's KV store.
// Rejects when the count did not actually land, so the UI never reports a
// save it cannot back up.
export async function sendReaction(name: string) {
  const response = await fetch("/api/reactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji: name }),
  });
  if (!response.ok) {
    throw new Error(`Reaction not recorded (${response.status})`);
  }
}

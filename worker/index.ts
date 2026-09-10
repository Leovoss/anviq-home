interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  REACTIONS: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://github.com https://em-content.zobj.net data:",
    "connect-src 'self' https://api.github.com https://github-contributions-api.jogruber.de",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

// Anonymous per-emoji click counters. No IP, no cookies, no per-user
// identity is ever stored - just an integer per emoji in KV. Names match
// the EmojiReaction component's DEFAULT_EMOJI_DATA keys.
const REACTION_EMOJI = [
  "smiling-face-with-hearts",
  "star-struck",
  "confused-face",
  "pleading-face",
  "grinning-face-with-smiling-eyes",
] as const;

async function getReactionCounts(env: Env): Promise<Record<string, number>> {
  const counts = await Promise.all(
    REACTION_EMOJI.map((emoji) => env.REACTIONS.get(`count:${emoji}`)),
  );
  return Object.fromEntries(
    REACTION_EMOJI.map((emoji, i) => [emoji, Number(counts[i]) || 0]),
  );
}

async function handleReactions(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    return Response.json(await getReactionCounts(env));
  }
  if (request.method === "POST") {
    let emoji: unknown;
    try {
      ({ emoji } = await request.json());
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    if (
      typeof emoji !== "string" ||
      !REACTION_EMOJI.includes(emoji as (typeof REACTION_EMOJI)[number])
    ) {
      return new Response("Unknown emoji", { status: 400 });
    }
    // ponytail: read-then-write, not atomic - KV has no native increment.
    // Fine for a low-traffic reaction counter; upgrade to a Durable Object
    // if concurrent clicks ever need exact accuracy.
    const current = Number(await env.REACTIONS.get(`count:${emoji}`)) || 0;
    const next = current + 1;
    await env.REACTIONS.put(`count:${emoji}`, String(next));
    return Response.json(await getReactionCounts(env));
  }
  return new Response("Method not allowed", { status: 405 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/reactions") {
      return withSecurityHeaders(await handleReactions(request, env));
    }
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};

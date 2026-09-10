interface Env {
  github_PAT: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const QUERY = `query {
  viewer {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

// Same bucketing GitHub's own public contribution graph uses.
function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

async function contributionsTotal(env: Env): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request("https://anviq.net/api/contributions");
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${env.github_PAT}`,
      "Content-Type": "application/json",
      "User-Agent": "anviq-home",
    },
    body: JSON.stringify({ query: QUERY }),
  });

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "upstream" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const data: unknown = await upstream.json();
  const calendar = (
    data as {
      data?: {
        viewer?: {
          contributionsCollection?: {
            contributionCalendar?: {
              totalContributions?: number;
              weeks?: { contributionDays?: { date: string; contributionCount: number }[] }[];
            };
          };
        };
      };
    }
  )?.data?.viewer?.contributionsCollection?.contributionCalendar;

  const count = calendar?.totalContributions;
  if (typeof count !== "number") {
    return new Response(JSON.stringify({ error: "invalid" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const days = (calendar.weeks ?? []).flatMap((week) =>
    (week.contributionDays ?? []).map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: levelFor(day.contributionCount),
    })),
  );

  const response = new Response(JSON.stringify({ count, days }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
  await cache.put(cacheKey, response.clone());
  return response;
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
    "img-src 'self' https://github.com data:",
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/contributions") {
      return withSecurityHeaders(await contributionsTotal(env));
    }
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};

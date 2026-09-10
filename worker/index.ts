interface Env {
  github_PAT: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const QUERY = `query {
  viewer {
    contributionsCollection {
      contributionCalendar {
        totalContributions
      }
    }
  }
}`;

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
  const count = (
    data as {
      data?: {
        viewer?: {
          contributionsCollection?: {
            contributionCalendar?: { totalContributions?: number };
          };
        };
      };
    }
  )?.data?.viewer?.contributionsCollection?.contributionCalendar?.totalContributions;

  if (typeof count !== "number") {
    return new Response(JSON.stringify({ error: "invalid" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const response = new Response(JSON.stringify({ count }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/contributions") {
      return contributionsTotal(env);
    }
    return env.ASSETS.fetch(request);
  },
};

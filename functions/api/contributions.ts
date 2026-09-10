interface Env {
  GITHUB_TOKEN: string;
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

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${env.GITHUB_TOKEN}`,
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
};

import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

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
      commitContributionsByRepository(maxRepositories: 5) {
        contributions {
          totalCount
        }
        repository {
          name
          isPrivate
          owner {
            login
          }
        }
      }
    }
  }
}`

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count <= 3) return 1
  if (count <= 6) return 2
  if (count <= 9) return 3
  return 4
}

// Local dev stand-in for the production Worker's /api/contributions route,
// so private contributions show up on localhost too, not just anviq.net.
// Reads the token server-side from .env.local (gitignored) -- never sent
// to the browser.
function contributionsDevApi(token: string | undefined): Plugin {
  return {
    name: 'contributions-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/contributions', async (_req, res) => {
        if (!token) {
          res.statusCode = 502
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'GITHUB_PAT not set in .env.local' }))
          return
        }
        try {
          const upstream = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
              Authorization: `bearer ${token}`,
              'Content-Type': 'application/json',
              'User-Agent': 'anviq-home-dev',
            },
            body: JSON.stringify({ query: QUERY }),
          })
          if (!upstream.ok) {
            res.statusCode = 502
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'upstream' }))
            return
          }
          const data: any = await upstream.json()
          const collection = data?.data?.viewer?.contributionsCollection
          const calendar = collection?.contributionCalendar
          const count = calendar?.totalContributions
          if (typeof count !== 'number') {
            res.statusCode = 502
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'invalid' }))
            return
          }
          const days = (calendar.weeks ?? []).flatMap(
            (week: { contributionDays?: { date: string; contributionCount: number }[] }) =>
              (week.contributionDays ?? []).map((day) => ({
                date: day.date,
                count: day.contributionCount,
                level: levelFor(day.contributionCount),
              })),
          )
          type RepoContribution = {
            contributions?: { totalCount?: number }
            repository?: { name?: string; isPrivate?: boolean; owner?: { login?: string } }
          }
          const repos = ((collection?.commitContributionsByRepository ?? []) as RepoContribution[])
            .filter((r) => r.repository?.name && r.repository.owner?.login)
            .map((r) => ({
              name: r.repository!.name!,
              owner: r.repository!.owner!.login!,
              isPrivate: !!r.repository!.isPrivate,
              count: r.contributions?.totalCount ?? 0,
            }))
            .sort((a, b) => b.count - a.count)
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ count, days, repos }))
        } catch {
          res.statusCode = 502
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'upstream' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), contributionsDevApi(env.GITHUB_PAT)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})

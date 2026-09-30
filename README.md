# Anviq site

Source for [anviq.net](https://anviq.net), the site of Anviq LLC, an independent IT consulting and software practice. React + TypeScript + Vite, styled with Tailwind CSS.

- `src/` - app source (pages, components, content data)
- `public/` - static assets (favicon, robots.txt, sitemap.xml, llms.txt)
- `worker/` - Cloudflare Worker that serves the built site
- `scripts/` - dev checks for the site navigator (`npm run audit:site-tree`, `npm run verify:navigation`)

## Development

```
npm install
npm run dev
```

## Build

```
npm run build
```

## Deploy

Runs as a Cloudflare Worker serving `dist/` as static assets, configured in `wrangler.jsonc`.

```
npx wrangler deploy
```

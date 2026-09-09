# Anviq site

Marketing site for Anviq, an independent forward deployed AI engineering practice. React + TypeScript + Vite, styled with Tailwind CSS.

- `src/` - app source (pages, components, content data)
- `public/` - static assets (favicon, robots.txt, sitemap.xml)

## Development

```
npm install
npm run dev
```

## Build

```
npm run build
```

## Hosting

Deploy on Cloudflare Pages: connect this repo, build command `npm run build`, output directory `dist`.

## Before public launch

- Confirm `lvoss@anviq.net` receives mail
- Point the `anviq.net` DNS at Cloudflare Pages once the project is created
- Swap or drop the Selected Work links (Steadyward, LV Matching, Addreach) if any shouldn't be public

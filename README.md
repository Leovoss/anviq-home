# Anviq site

Static one-page marketing site for Anviq, an independent forward deployed AI engineering practice. Built from the Phase 4 brand handbook and design tokens (colors, type scale, spacing, logo mark).

- `index.html` — the whole site (Tailwind CDN, IBM Plex fonts, no build step)
- `robots.txt`, `sitemap.xml`, `_headers` — Cloudflare Pages basics

## Hosting
No build step. Deploy on Cloudflare Pages: connect this repo, leave the build command empty, set the output directory to `/`.

## Before public launch
- Confirm `lvoss@anviq.net` receives mail
- Point the `anviq.net` DNS at Cloudflare Pages once the project is created
- Swap or drop the Selected Work links (Steadyward, LV Matching, Addreach) if any shouldn't be public

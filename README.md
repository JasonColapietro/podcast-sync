# Podcast Sync

YouTube → Podcast RSS pipeline for [@aisuede](https://youtube.com/@aisuede).

Pulls new episodes, syncs audio to Cloudflare R2, and serves a standard podcast RSS feed via Vercel — so the YouTube channel is also listenable in any podcast app.

## How it works

`sync.js` fetches new uploads, uploads audio to R2, and writes `synced.json` as the sync state. The generated feed is served through the `public/` + `vercel.json` deployment.

`public/feed.xml` is generated output — never edit it by hand. Its shape lives in
`feed-template.mjs`, shared by `sync.js` (which needs YouTube and R2) and
`regen-feed.mjs` (which does not). To change the feed, edit the template and run
`npm run regen:feed`; `npm run check:feed` fails if the committed XML has drifted
from the template. `build-episodes.mjs` then regenerates the episode pages and
sitemap from the feed.

## Run

```bash
npm install
cp .env.example .env   # fill in R2 + YouTube credentials
npm run sync
```

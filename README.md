# Podcast Sync

YouTube → Podcast RSS pipeline for [@aisuede](https://youtube.com/@aisuede).

Pulls new episodes, syncs audio to Cloudflare R2, and serves a standard podcast RSS feed via Vercel — so the YouTube channel is also listenable in any podcast app.

## How it works

`sync.js` fetches new uploads, uploads audio to R2, and writes `synced.json` as the sync state. The generated feed is served through the `public/` + `vercel.json` deployment.

## Run

```bash
npm install
cp .env.example .env   # fill in R2 + YouTube credentials
npm run sync
```

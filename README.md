# Podcast Sync

YouTube → Podcast RSS pipeline for [@aisuede](https://youtube.com/@aisuede).

Pulls new episodes, syncs audio to Cloudflare R2, and serves a standard podcast RSS feed via Vercel — so the YouTube channel is also listenable in any podcast app.

## How it works

`sync.js` fetches new uploads, uploads audio to R2, and writes `synced.json` as the sync state. The generated feed is served through the `public/` + `vercel.json` deployment.

`public/feed.xml` is generated output — never edit it by hand. Its shape lives in
`feed-template.mjs`, shared by `sync.js` (which needs YouTube and R2) and
`regen-feed.mjs` (which does not). To change the feed, edit the template and run
`npm run regen:feed`; `npm run check:feed` fails if the committed XML has drifted
from the template. `build-episodes.mjs` then regenerates the episode pages, the
topic hubs under `/topics`, and the sitemap from the feed. A hub is defined in
`keywords.mjs` (`TOPIC_HUBS`); `topics.mjs` decides which episodes belong to it
from each episode's own show notes, picks related episodes, and finds the Suede
products the notes name (`suede-sites.mjs`, live-checked links only).

## Run

```bash
npm install
cp .env.example .env   # fill in R2 + YouTube credentials
npm run sync
```

## Naming

The company is "Suede" (owner direction, 2026-11-21); the show is "AI Suede". Sub-brands drop "AI" and "Labs" ("Suede SEO", "Suede GEO", "Suede IP Registry"). In Suede's own copy (pages, notes, the feed's channel copy, llms.txt, ai-instructions) "Suede AI" and "Suede Labs" appear only as the Organization's schema `alternateName`, the one alias line "Suede was formerly known as Suede AI and Suede Labs.", and the verbatim or historical text listed in `test/brand-name.test.mjs`. Episode titles and show notes are the published episode record: `fixTitle`/`fixDescription` in `feed-template.mjs` render them as they have been published, so episode pages, topic hubs, appearances and `llms-full.txt` still carry the names those episodes used. `test/brand-name.test.mjs` (in `npm test`) fails any other "Suede AI" or "Suede Labs" in Suede's own copy.

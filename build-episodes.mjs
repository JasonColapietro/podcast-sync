#!/usr/bin/env node
/**
 * Generate a crawlable page per episode from public/feed.xml.
 *
 * The feed carries every episode; the website carried three URLs (home, /about,
 * /contact) and listed no episodes at all. So the whole body of work was
 * reachable only by a podcast client parsing XML — nothing for a search engine
 * to index, no titles, no show notes to quote, nothing an answer engine could
 * cite. Every episode is a page that could rank for what it discusses.
 *
 * Reads only committed data (public/feed.xml), so this runs without the R2 and
 * YouTube credentials sync.js needs. Run it after `npm run sync` regenerates the
 * feed:  node build-episodes.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const EPISODES_DIR = join(PUBLIC, "episodes");
const SITE = "https://podcast.suedeai.ai";
const ARTWORK = `${SITE}/artwork.jpg`;

const xml = readFileSync(join(PUBLIC, "feed.xml"), "utf8");

// The (?=[\s/>]) lookahead is load-bearing: without it, <itunes:episode…> also
// matches <itunes:episodeType>, and pick("itunes:episode") returns
// "full</itunes:episodeType>\n  <itunes:episode>33" instead of "33". That fed
// Number() a NaN, which JSON.stringify writes as null — so every episode page
// would have shipped "episodeNumber": null. Any tag whose name is a prefix of
// another tag's name has this problem.
const pick = (block, tag) => {
  const m = block.match(
    new RegExp(`<${tag}(?=[\\s/>])[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`),
  );
  return m ? m[1].trim() : "";
};
const attr = (block, tag, name) => {
  const m = block.match(new RegExp(`<${tag}(?=[\\s/>])[^>]*\\s${name}="([^"]*)"`));
  return m ? m[1] : "";
};
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const stripTags = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Stable, readable slug. Falls back to the guid so a page always has a home. */
const slugify = (title, guid) => {
  const base = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return base || String(guid).toLowerCase().replace(/[^a-z0-9]+/g, "-");
};

/** "2:27:14" or "20:44" -> ISO 8601 duration, which is what schema.org wants. */
const isoDuration = (hms) => {
  const parts = String(hms).split(":").map((n) => parseInt(n, 10));
  if (parts.some(Number.isNaN) || !parts.length) return "";
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1] ?? 0];
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}` || "";
};

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
if (!items.length) {
  console.error("build-episodes: no <item> entries in feed.xml — refusing to wipe episodes/");
  process.exit(1);
}

const episodes = items.map((block) => {
  const title = stripTags(pick(block, "title"));
  const guid = pick(block, "guid");
  const pubDate = pick(block, "pubDate");
  const descRaw = pick(block, "content:encoded") || pick(block, "description");
  const description = stripTags(descRaw);
  const audio = attr(block, "enclosure", "url");
  const duration = pick(block, "itunes:duration");
  const number = pick(block, "itunes:episode");
  const iso = pubDate ? new Date(pubDate).toISOString() : "";
  return {
    title,
    guid,
    pubDate,
    iso,
    date: iso ? iso.slice(0, 10) : "",
    description,
    descriptionHtml: descRaw,
    audio,
    duration,
    isoDuration: isoDuration(duration),
    number,
    slug: slugify(title, guid),
    url: `${SITE}/episodes/${slugify(title, guid)}`,
  };
});

// Guard against two episodes colliding on one slug and silently overwriting.
const seen = new Map();
for (const e of episodes) {
  if (seen.has(e.slug)) {
    e.slug = `${e.slug}-${String(e.guid).slice(-6).replace(/[^a-z0-9]/gi, "")}`;
    e.url = `${SITE}/episodes/${e.slug}`;
  }
  seen.set(e.slug, true);
}

const SHARED_HEAD = (e) => `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(e.title)} | AI Suede Podcast</title>
    <meta name="description" content="${esc(e.description.slice(0, 180))}" />
    <link rel="canonical" href="${e.url}" />
    <link
      rel="alternate"
      type="application/rss+xml"
      title="AI Suede - Build, Create, Ship"
      href="${SITE}/feed.xml"
    />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="AI Suede Podcast" />
    <meta property="og:title" content="${esc(e.title)}" />
    <meta property="og:description" content="${esc(e.description.slice(0, 180))}" />
    <meta property="og:url" content="${e.url}" />
    <meta property="og:image" content="${ARTWORK}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@AISUEDE" />
    <meta name="twitter:creator" content="@johnnysuede" />`;

const episodeJsonLd = (e) =>
  JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "PodcastEpisode",
          "@id": `${e.url}#episode`,
          name: e.title,
          url: e.url,
          description: e.description.slice(0, 600),
          datePublished: e.iso || undefined,
          // Belt and braces: only emit the key when it parses to a real number,
          // so a future feed change cannot reintroduce "episodeNumber": null.
          ...(Number.isFinite(Number(e.number)) && e.number !== ""
            ? { episodeNumber: Number(e.number) }
            : {}),
          ...(e.isoDuration ? { timeRequired: e.isoDuration } : {}),
          partOfSeries: { "@id": `${SITE}/#podcast` },
          associatedMedia: e.audio
            ? {
                "@type": "MediaObject",
                contentUrl: e.audio,
                encodingFormat: "audio/mpeg",
                ...(e.isoDuration ? { duration: e.isoDuration } : {}),
              }
            : undefined,
          author: { "@id": "https://suedeai.ai/founder#person" },
        },
        {
          "@type": "PodcastSeries",
          "@id": `${SITE}/#podcast`,
          name: "AI Suede - Build, Create, Ship",
          url: `${SITE}/`,
          webFeed: `${SITE}/feed.xml`,
        },
        {
          "@type": "Person",
          "@id": "https://suedeai.ai/founder#person",
          name: "Jason Colapietro",
          alternateName: "Johnny Suede",
          url: "https://suedeai.ai/founder",
        },
      ],
    },
    null,
    2,
  );

const STYLE = `      :root { color-scheme: dark; --bg:#09090b; --panel:#151517; --text:#f4f4f5;
        --muted:#a1a1aa; --line:#2a2a2e; --accent:#f43f5e; }
      * { box-sizing: border-box; }
      body { margin:0; min-height:100vh; background:var(--bg); color:var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; line-height:1.6; }
      main { width:min(760px, calc(100% - 40px)); margin:0 auto; padding:64px 0; }
      a { color:var(--accent); }
      .eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:12px;
        color:var(--muted); margin:0 0 8px; }
      h1 { font-size:clamp(24px,4vw,38px); line-height:1.2; margin:0 0 12px; }
      .meta { color:var(--muted); font-size:14px; margin:0 0 28px; }
      .notes { white-space:pre-wrap; }
      audio { width:100%; margin:20px 0 28px; }
      nav.crumbs { font-size:14px; color:var(--muted); margin-bottom:24px; }
      hr { border:0; border-top:1px solid var(--line); margin:36px 0; }`;

const episodePage = (e) => `<!doctype html>
<html lang="en">
  <head>
${SHARED_HEAD(e)}
    <script type="application/ld+json">
${episodeJsonLd(e)}
    </script>
    <style>
${STYLE}
    </style>
  </head>
  <body>
    <main>
      <nav class="crumbs"><a href="/">AI Suede Podcast</a> &rsaquo; Episode</nav>
      <p class="eyebrow">Episode${e.number ? ` ${esc(e.number)}` : ""}</p>
      <h1>${esc(e.title)}</h1>
      <p class="meta">
        ${e.date ? `Published ${esc(e.date)}` : ""}${e.date && e.duration ? " &middot; " : ""}${e.duration ? `${esc(e.duration)}` : ""}
      </p>
      ${e.audio ? `<audio controls preload="none" src="${esc(e.audio)}"></audio>` : ""}
      <div class="notes">${esc(e.description)}</div>
      <hr />
      <p class="meta">
        From <a href="/">AI Suede — Build, Create, Ship</a> by
        <a href="https://suedeai.ai/founder">Jason Colapietro</a>.
        Subscribe via <a href="/feed.xml">RSS</a>.
      </p>
    </main>
  </body>
</html>
`;

// Regenerate cleanly so a retitled episode does not leave a stale page behind.
if (existsSync(EPISODES_DIR)) rmSync(EPISODES_DIR, { recursive: true });
mkdirSync(EPISODES_DIR, { recursive: true });
for (const e of episodes) {
  writeFileSync(join(EPISODES_DIR, `${e.slug}.html`), episodePage(e));
}

// Sitemap: the three static pages plus every episode.
const staticUrls = [
  { loc: `${SITE}/`, changefreq: "weekly", priority: "1.0" },
  { loc: `${SITE}/about`, changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE}/contact`, changefreq: "monthly", priority: "0.5" },
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
  )
  .join("\n")}
${episodes
  .map(
    (e) =>
      `  <url>\n    <loc>${e.url}</loc>${e.date ? `\n    <lastmod>${e.date}</lastmod>` : ""}\n    <changefreq>yearly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
  )
  .join("\n")}
</urlset>
`;
writeFileSync(join(PUBLIC, "sitemap.xml"), sitemap);

// Episode list on the homepage. Without it the episode pages are orphans —
// present in the sitemap but reachable from nothing, which is the weakest form
// of "indexable" there is.
const listHtml = `        <section class="episodes" aria-labelledby="episodes-heading">
          <h2 id="episodes-heading">Episodes</h2>
          <ol class="episode-list">
${episodes
  .map(
    (e) =>
      `            <li>\n              <a href="/episodes/${e.slug}">${esc(e.title)}</a>\n              <span class="ep-meta">${e.date ? esc(e.date) : ""}${e.date && e.duration ? " &middot; " : ""}${e.duration ? esc(e.duration) : ""}</span>\n            </li>`,
  )
  .join("\n")}
          </ol>
        </section>`;

const indexPath = join(PUBLIC, "index.html");
let index = readFileSync(indexPath, "utf8");
const START = "<!-- EPISODES:START -->";
const END = "<!-- EPISODES:END -->";
const block = `${START}\n${listHtml}\n        ${END}`;
if (index.includes(START)) {
  index = index.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
} else {
  index = index.replace("    </main>", `      ${block}\n    </main>`);
}
if (!index.includes(".episode-list")) {
  index = index.replace(
    "    </style>",
    `      .episodes { margin-top: 48px; }
      .episode-list { list-style: decimal; padding-left: 24px; }
      .episode-list li { margin: 10px 0; }
      .ep-meta { display: block; color: var(--muted); font-size: 13px; }
    </style>`,
  );
}
writeFileSync(indexPath, index);

console.log(`build-episodes: ${episodes.length} episode pages`);
console.log(`build-episodes: sitemap ${staticUrls.length + episodes.length} URLs`);

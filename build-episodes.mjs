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
 *
 * The pure parsing/summary helpers are exported so a test can assert on the
 * generated metadata without spawning the build; the file-writing work only runs
 * when this module is executed directly.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
  APPEARANCES_URL,
  allCreditNodes,
  creditSentence,
  episodeCredit,
  groupAppearances,
  guestSentence,
  hostedCredit,
} from "./appearances.mjs";
import {
  MIN_HUB_EPISODES,
  PAGE_KEYWORDS,
  TOPIC_HUBS,
  episodeKeywords,
  keywordContent,
  topicPath,
} from "./keywords.mjs";
import { productByKey } from "./suede-sites.mjs";
import { hubEpisodes, productsFor, proseLine, relatedEpisodes, topicQuotes, topicsFor } from "./topics.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const EPISODES_DIR = join(PUBLIC, "episodes");
const TOPICS_DIR = join(PUBLIC, "topics");
const SITE = "https://podcast.suedeai.ai";
const ARTWORK = `${SITE}/artwork.jpg`;
// Pages share a 1200x630 card for link previews. ARTWORK stays the square
// 3000px show art that the feed and the PodcastSeries node carry.
export const SOCIAL_IMAGE = { url: `${SITE}/og-image.jpg`, width: 1200, height: 630 };
const SHOW = "AI Suede: Build, Create, Ship";
const ORG_ID = "https://suedeai.ai/#organization";
// Canonical Person @id for the host. The node itself is published at
// https://suedeai.ai/founder; every page in this estate points at it rather
// than redeclaring it.
const PERSON_ID = "https://suedeai.ai/founder#person";

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

/**
 * Reduce feed prose to a clean, single-line, plain-text string suitable for a
 * meta description: drop HTML tags, markdown emphasis, emoji, and list glyphs,
 * then collapse whitespace. The old code fed raw `content:encoded` straight into
 * `.slice(0, 180)`, so meta descriptions shipped literal "•", "✅", and "**"
 * markers and were cut in the middle of a word.
 */
const cleanText = (s) =>
  String(s)
    .replace(/<[^>]+>/g, " ") // HTML tags
    .replace(/\*\*|__/g, "") // markdown bold
    .replace(/[*_`]/g, "") // stray markdown emphasis / code ticks
    .replace(/\p{Extended_Pictographic}/gu, " ") // emoji (covers checkmark, mic, rocket, …)
    .replace(/[\uFE0F\u200D\u20E3]/g, "") // variation selector, ZWJ, keycap
    .replace(/[•▪●◦‣·➤➡→»]/g, " ") // list bullet glyphs
    .replace(/\s+/g, " ")
    .trim();

/**
 * True when the source text is not a usable summary — a bare token like
 * "$SUEDE", a keyword stub ("Suede ai"), or a fragment that just echoes the
 * title. These episodes have no real per-episode summary in the feed, so we fall
 * back to an honest, generated sentence instead of shipping a 6-char meta.
 */
const looksLikeStub = (text) => cleanText(text).length < 60;

/** Honest, episode-specific fallback when the feed carries no real summary. */
const fallbackSummary = (e) => {
  const title = cleanText(e.title)
    .replace(/#\w+/g, "") // drop trailing hashtags
    .replace(/\s+/g, " ")
    .trim();
  const lead = e.number ? `Episode ${e.number} of ${SHOW}` : `From ${SHOW}`;
  const end = /[.!?]$/.test(title) ? "" : ".";
  return `${lead}: ${title}${end}`;
};

/** A list lead-in that ends an intro paragraph ("… We get into:"). */
const LEAD_IN =
  /\s*\b(?:we(?:['’]| )?ll?\s+(?:get into|discuss|be discussing|cover|be covering|dig into|talk about)|we discuss|in this (?:episode|clip|space|conversation|ama)|here['’]?s what)\b[:\-–—\s]*$/i;

/**
 * The full (untruncated) plain-text summary for an episode: the opening
 * paragraph of the show notes, cleaned; if that opener is too thin, the rest of
 * the notes (bullets de-listed into running text) is appended so the summary is
 * never sparse. Stubs get the honest fallback. This is the string a meta
 * description is truncated from, and the schema description is derived from.
 */
const resolveSummary = (e) => {
  const raw = e.descriptionHtml || "";
  const paras = raw.split(/\n\s*\n+/);
  let intro = cleanText(paras[0] || "");
  intro = intro.replace(LEAD_IN, "").trim();
  if (intro.length < 60) {
    intro = cleanText(`${intro} ${cleanText(paras.slice(1).join(" "))}`);
  }
  if (looksLikeStub(intro)) return fallbackSummary(e);
  return intro;
};

/**
 * Truncate at a word boundary — never mid-word — appending an ellipsis when the
 * text was actually shortened. ~155 chars is the meta-description sweet spot.
 */
const truncateAtWord = (text, limit = 155) => {
  const t = cleanText(text);
  if (t.length <= limit) return t;
  let cut = t.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace >= 40) cut = cut.slice(0, lastSpace);
  cut = cut.replace(/[\s.,;:!?)»"'’—–-]+$/, "");
  return `${cut}…`;
};

/**
 * Word-safe meta description, 120 to 160 characters. A summary shorter than
 * 120 (a stub's fallback sentence, or a one-line note) is followed by a plain
 * statement of what the page is and when the recording was published, so the
 * snippet stays specific to this episode without inventing anything about it.
 */
const META_MIN = 120;
const descriptionTail = (e) => {
  const when = e.date ? ` Published ${e.date}` : "";
  const length = e.duration ? `, ${e.duration} long` : "";
  return [
    `.${when}${length}. Show notes and audio from the AI Suede Podcast with Jason Colapietro.`,
    `.${when}${length}. Show notes and audio on the AI Suede Podcast.`,
    ". Show notes and audio from the AI Suede Podcast with Jason Colapietro.",
    `.${when}. Show notes and audio on the AI Suede Podcast.`,
    ". Show notes and audio on the AI Suede Podcast.",
  ];
};
const metaDescription = (e) => {
  const base = truncateAtWord(resolveSummary(e), 155);
  if (base.length >= META_MIN || base.endsWith("…")) return base;
  const head = base.replace(/[.!?]$/, "");
  for (const tail of descriptionTail(e)) {
    const full = `${head}${tail}`;
    if (full.length >= META_MIN && full.length <= 160) return full;
  }
  return base;
};

/**
 * <title> for an episode page, at most 65 characters. The feed titles run to
 * 99 characters, so the page title is the feed title cut at a " | " segment
 * where one fits, otherwise at a word boundary, and the show name is appended
 * only when it still fits. The visible <h1> and the schema keep the full title.
 */
const TITLE_MAX = 65;
const TITLE_SUFFIX = " | AI Suede Podcast";
const TITLE_TRAIL = /[\s,;:|·×+&\-–—]+$/;
const TITLE_DANGLE = /\s+(?:and|or|the|a|an|of|on|in|for|to|with|from|at|by|x|×|\+|&)$/i;
const fitTitleWords = (text, limit) => {
  if (text.length <= limit) return text;
  let cut = text.slice(0, limit + 1);
  cut = cut.slice(0, cut.lastIndexOf(" "));
  for (let i = 0; i < 3; i += 1) cut = cut.replace(TITLE_TRAIL, "").replace(TITLE_DANGLE, "");
  return cut;
};
export const pageTitle = (e) => {
  const full = cleanText(e.title).replace(/(?:\s+#\w+)+\s*$/g, "").trim();
  const parts = full.split(" | ");
  const variants = parts.map((_, i) => parts.slice(0, parts.length - i).join(" | "));
  for (const v of variants) if (`${v}${TITLE_SUFFIX}`.length <= TITLE_MAX) return `${v}${TITLE_SUFFIX}`;
  for (const v of variants) if (v.length <= TITLE_MAX) return v;
  return fitTitleWords(variants[variants.length - 1], TITLE_MAX);
};
/** Word-safe schema.org description — a fuller summary, still bullet-free. */
const schemaDescription = (e) => truncateAtWord(resolveSummary(e), 400);
/**
 * The summary on a topic hub entry: the first paragraph of the show notes that
 * says something (60 characters or more, no link, not just the title), whole.
 * The 400-character schema description ended two hub entries mid-sentence, and
 * when the opener is only the title (episode 14) resolveSummary runs on into
 * the link lines. Stubs fall back to resolveSummary's sentence.
 */
const hubSummary = (e) => {
  const title = cleanText(e.title).toLowerCase();
  const para = String(e.descriptionHtml || "")
    .split(/\n\s*\n+/)
    .map((p) => cleanText(p).replace(LEAD_IN, "").trim())
    .find((p) => p.length >= 60 && !/https?:\/\//i.test(p) && p.toLowerCase() !== title);
  return para ?? resolveSummary(e);
};
/** Visible show-notes body: strip markdown emphasis; give stubs an honest line. */
const bodyText = (e) =>
  looksLikeStub(e.description) ? fallbackSummary(e) : e.description.replace(/\*\*|__/g, "");

/**
 * YouTube chapter markers for uploads whose own description has none
 * (chapters.json, captured from the upload; see its _comment). Rendered as their
 * own section with a line saying where they came from, never merged into the
 * show notes, so the notes stay exactly the feed's words.
 */
const CHAPTERS = JSON.parse(readFileSync(join(__dirname, "chapters.json"), "utf8"));
export const videoId = (e) => String(e.guid).replace(/^aisuede-/, "");
const clock = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
const toSeconds = (stamp) =>
  String(stamp)
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);

/**
 * The upload a feed item came from. sync.js downloads every episode from
 * https://www.youtube.com/watch?v=<id>, with <id> the feed guid minus its
 * "aisuede-" prefix, so this is the same URL, opened at `seconds`.
 */
export const youtubeAt = (e, seconds) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId(e))}${seconds ? `&t=${seconds}s` : ""}`;

const NOTES_CHAPTER_MARKER = "⏱️ Chapters";
const CHAPTER_LINE = /^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/;
const BULLET_LINE = /^[•✅▪‣]\s*/u;

/** The show-notes text a page renders: the feed's own copy, or the honest fallback for a stub. */
const notesSource = (e) =>
  looksLikeStub(e.description)
    ? fallbackSummary(e)
    : String(e.descriptionHtml).replace(/<[^>]+>/g, " ").replace(/\*\*|__/g, "");

/**
 * Split an episode's notes into the notes proper and, where there is one, a
 * chapter list. The one long description carries its own "⏱️ Chapters" block;
 * two uploads without one have YouTube's markers in chapters.json. Either way
 * every word of the feed copy is rendered once, in order.
 */
export const episodeContent = (e) => {
  const text = notesSource(e);
  const at = text.indexOf(NOTES_CHAPTER_MARKER);
  if (at > 0) {
    const items = [];
    const after = [];
    for (const raw of text.slice(at + NOTES_CHAPTER_MARKER.length).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(CHAPTER_LINE);
      if (m && !after.length) items.push({ start: toSeconds(m[1]), stamp: m[1], title: m[2] });
      else after.push(line);
    }
    return {
      notes: text.slice(0, at).trim(),
      chapters: {
        intro:
          "Chapter markers from the show notes. Each time opens the recording at that point on YouTube.",
        items,
        after: after.join("\n"),
      },
    };
  }
  const list = CHAPTERS[videoId(e)];
  if (Array.isArray(list) && list.length) {
    return {
      notes: text.trim(),
      chapters: {
        intro:
          "YouTube generated these chapter markers for the upload of this recording; the show notes carry none. " +
          "Each time opens the recording at that point on YouTube.",
        items: list.map((c) => ({ start: c.start, stamp: clock(c.start), title: c.title })),
        after: "",
      },
    };
  }
  return { notes: text.trim(), chapters: null };
};

/**
 * Feed notes as HTML blocks: blank lines separate paragraphs, lines that open
 * with a list glyph become list items (the glyph is the list marker now), and
 * every other line break is kept. The feed copy used to be collapsed into one
 * run-on paragraph with its bullets inline.
 */
const renderNotes = (text) => {
  const out = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(esc).join("<br />\n")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list.length) out.push(`<ul>\n${list.map((item) => `<li>${esc(item)}</li>`).join("\n")}\n</ul>`);
    list = [];
  };
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) {
      flushPara();
      flushList();
    } else if (BULLET_LINE.test(line)) {
      flushPara();
      list.push(line.replace(BULLET_LINE, ""));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join("\n");
};

/**
 * Episode URLs are permanent. These titles said "Suede Labs" when their pages
 * went live; the feed now renders them as "Suede AI", but the URL stays put so
 * inbound links, the sitemap history and appearances.mjs keys keep resolving.
 */
export const PINNED_SLUGS = {
  "aisuede-W1LxsxwGHK4": "how-music-ip-becomes-a-real-world-asset-on-base-suede-labs-avax-chainlin",
  "aisuede-CdZWyuwhhS0": "aj-writes-crypto-and-suede-labs-ai",
  "aisuede-VFTtm9EzMYs": "why-suede-labs-chose-avalanche-for-music-ip-the-subnet-architecture-bet",
  "aisuede-wI89GiGIvYo": "mario-nawfal-suede-labs-the-web3-music-stack-explained",
  "aisuede-TbCvLzh1psc": "binance-ama-suede-labs-on-the-music-ip-stack-full-recap",
  "aisuede-7ktod33U8o0": "fity-eth-suede-labs-the-dark-truth-about-crypto-launches",
  "aisuede-hm45Z3yUPZA": "coinmerge-fity-eth-on-suede-labs-sol-train",
  "aisuede-PuLkFjiXwsY": "block-suede-labs-how-on-chain-royalties-actually-work",
  "aisuede-_VLl8MNgePM": "block-suede-labs-ama-the-music-stack-on-base",
  "aisuede-EUJjMQpt6Ls": "block-suede-labs-weekly-build-update-march-6-2025",
  "aisuede-QO5YfD9q-KU": "apex-exchange-suede-labs-ai-music-crypto-distribution",
  "aisuede-vFUa3R4x6ls": "btse-suede-labs-redefining-the-music-industry-with-crypto-ai",
  "aisuede-DUO1njPGruw": "block-suede-labs-chill-ama-the-future-of-ai-in-music-web3",
  "aisuede-yS81oANTwf0": "digifinex-suede-labs-ep-15-where-ai-and-music-are-headed",
  "aisuede-wzdMA1mTtQI": "binance-suede-labs-ai-music-web3-creativity-full-ama",
  "aisuede-FYWTqMPyvb0": "binance-livestream-ama-suede-labs-founder-on-music-ip",
};

/** Stable, readable slug. Falls back to the guid so a page always has a home. */
const slugify = (title, guid) => {
  if (PINNED_SLUGS[guid]) return PINNED_SLUGS[guid];
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

/**
 * Parse feed XML into fully-formed episode objects (slugs de-duplicated,
 * summaries/meta/body resolved). Pure — no file I/O — so a test can call it.
 */
export const parseEpisodes = (xml) => {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  if (!items.length) return [];

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
    const e = {
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
    e.metaDescription = metaDescription(e);
    // The summary shown in lists on other pages: the notes' own words only.
    e.listSummary = truncateAtWord(resolveSummary(e), 155);
    e.schemaDescription = schemaDescription(e);
    e.body = bodyText(e);
    return e;
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
  return episodes;
};

// Exported so the guard test can prove truncation lands on a word boundary.
export { resolveSummary, metaDescription, descriptionTail, schemaDescription, hubSummary, truncateAtWord, looksLikeStub, fallbackSummary, cleanText };

const SHARED_HEAD = (e) => `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(pageTitle(e))}</title>
    <meta name="description" content="${esc(e.metaDescription)}" />
    <meta name="keywords" content="${esc(episodeKeywords(e).join(", "))}" />
    <link rel="canonical" href="${e.url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link
      rel="alternate"
      type="application/rss+xml"
      title="AI Suede: Build, Create, Ship"
      href="${SITE}/feed.xml"
    />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="AI Suede Podcast" />
    <meta property="og:title" content="${esc(e.title)}" />
    <meta property="og:description" content="${esc(e.metaDescription)}" />
    <meta property="og:url" content="${e.url}" />
${socialImageTags()}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@AISUEDE" />
    <meta name="twitter:creator" content="@johnnysuede" />
    <meta name="twitter:title" content="${esc(e.title)}" />
    <meta name="twitter:description" content="${esc(e.metaDescription)}" />
    <meta name="twitter:image" content="${SOCIAL_IMAGE.url}" />`;

/** og:image block shared by every generated page. */
function socialImageTags() {
  return `    <meta property="og:image" content="${SOCIAL_IMAGE.url}" />
    <meta property="og:image:width" content="${SOCIAL_IMAGE.width}" />
    <meta property="og:image:height" content="${SOCIAL_IMAGE.height}" />
    <meta property="og:image:alt" content="AI Suede Podcast with Jason Colapietro" />`;
}

/**
 * BreadcrumbList from the home page down to `crumbs`. Inlined (no @id) in the
 * page node, so it never reads as a separately described entity.
 */
const breadcrumbList = (crumbs) => ({
  "@type": "BreadcrumbList",
  itemListElement: [{ name: "AI Suede Podcast", item: `${SITE}/` }, ...crumbs].map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: c.item,
  })),
});

/** WebPage node, with its breadcrumb, for a generated page below the home page. */
const pageNodes = ({ url, name, description, crumbs, extra = {} }) => [
  {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE}/#podcast` },
    publisher: { "@id": ORG_ID },
    breadcrumb: breadcrumbList(crumbs),
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: SOCIAL_IMAGE.url,
      width: SOCIAL_IMAGE.width,
      height: SOCIAL_IMAGE.height,
    },
    ...extra,
  },
];

/**
 * Most of these recordings are appearances on other people's programmes. For
 * those, the credit comes from appearances.mjs: `actor` for him and for any host
 * who is a Person, `producer` for whoever put the recording on, `isBasedOn` for
 * the original show — and no `author`, because he did not author them.
 *
 * Episodes he genuinely made keep `author`, and five of those carry the inverse
 * credit: he is the author and the third party the notes name is the guest, with
 * no `producer` and no `isBasedOn` because nobody else put them on. Both tables
 * live in appearances.mjs; a slug is in at most one of them, so the two lookups
 * can never both answer.
 *
 * Which property any of these entities lands under is decided by its type, not
 * its role — `actor` is Person-only in schema.org, so an organisation is
 * credited by a property that is in range for it, whether it hosted the
 * recording or guested on it. See THE TYPE RULE and the evidence rule, both in
 * appearances.mjs.
 */
// A sitemap <lastmod> describes the page, not the episode. These pages were
// generated on 2026-08-03 for episodes that aired in 2024 and 2025, and the
// sitemap dated every one of them to its air date, understating the newest
// by a hundred days and the oldest by six hundred (record-audit.py in
// suede-seo, 2026-09-11). Nor is the page's last commit the answer: an
// em-dash pass on 2026-09-05 touched all 33 pages without changing a word.
// The date is the newest commit that changed more than two lines of the
// page's own words: not <head> lines (title, <meta>, <link>, JSON-LD), not a line the same commit
// changed identically in other pages, not a line whose letters and digits
// survived. That is the rule record-audit.py applies, so the two agree.
// A page not yet committed, or regenerated with changes, is dated today;
// nothing is dated before the episode itself.
function localToday() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
const git = (...args) => spawnSync("git", ["-C", __dirname, ...args], { encoding: "utf8" });
const wordsOf = (line) => line.toLowerCase().replace(/[^0-9a-z]+/g, "");
const META_LINE = /^\s*<(meta|link)\b/;
const commitCache = new Map();
// The diff is read with full context so each changed line is known to be in
// <head> or not. Head lines (title, meta, JSON-LD) describe the page; they are
// not its words, so a metadata-only commit does not move the content date.
function commitChanges(sha) {
  if (!commitCache.has(sha)) {
    const files = new Map();
    let cur = null;
    let inHead = false;
    const out = git("show", "--format=", "-U1000000", sha).stdout || "";
    for (const line of out.split("\n")) {
      if (line.startsWith("diff --git ")) { cur = line.split(" b/")[1]; files.set(cur, []); inHead = false; continue; }
      if (!cur || line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) continue;
      const body = line.slice(1);
      if (/<head\b/i.test(body)) inHead = true;
      if ((line[0] === "+" || line[0] === "-") && !inHead) files.get(cur).push([line[0], body]);
      if (/<\/head>/i.test(body)) inHead = false;
    }
    commitCache.set(sha, files);
  }
  return commitCache.get(sha);
}
function ownContentChanged(sha, rel) {
  const files = commitChanges(sha);
  const mine = files.get(rel) || [];
  const shared = new Set();
  for (const [f, lines] of files) if (f !== rel) for (const [, c] of lines) shared.add(c.trim());
  const removed = new Set(mine.filter(([s]) => s === "-").map(([, c]) => wordsOf(c)));
  const added = new Set(mine.filter(([s]) => s === "+").map(([, c]) => wordsOf(c)));
  const restyled = new Set([...removed].filter((w) => w && added.has(w)));
  let n = 0;
  for (const [, c] of mine) {
    const key = c.trim();
    if (!key || META_LINE.test(c) || shared.has(key) || restyled.has(wordsOf(c))) continue;
    n += 1;
  }
  return n > 2;
}
function contentDate(rel) {
  if ((git("status", "--porcelain", "--", rel).stdout || "").trim()) return localToday();
  const shas = (git("log", "-50", "--format=%h", "--", rel).stdout || "").split("\n").filter(Boolean);
  for (const sha of shas) {
    if (ownContentChanged(sha, rel)) return (git("log", "-1", "--format=%cs", sha).stdout || "").trim();
  }
  const first = shas[shas.length - 1];
  return first ? (git("log", "-1", "--format=%cs", first).stdout || "").trim() : localToday();
}
const pageLastmod = (e) => {
  const page = contentDate(join("public", "episodes", `${e.slug}.html`));
  return e.date && e.date > page ? e.date : page;
};

const episodeJsonLd = (e) => {
  const credit = episodeCredit(e.slug, PERSON_ID) ?? hostedCredit(e.slug, PERSON_ID);
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "PodcastEpisode",
          "@id": `${e.url}#episode`,
          name: e.title,
          url: e.url,
          description: e.schemaDescription,
          keywords: episodeKeywords(e).join(", "),
          datePublished: e.iso || undefined,
          // Belt and braces: only emit the key when it parses to a real number,
          // so a future feed change cannot reintroduce "episodeNumber": null.
          ...(Number.isFinite(Number(e.number)) && e.number !== ""
            ? { episodeNumber: Number(e.number) }
            : {}),
          ...(e.isoDuration ? { timeRequired: e.isoDuration } : {}),
          partOfSeries: { "@id": `${SITE}/#podcast` },
          mainEntityOfPage: { "@id": `${e.url}#webpage` },
          image: ARTWORK,
          inLanguage: "en-US",
          associatedMedia: e.audio
            ? {
                "@type": "MediaObject",
                contentUrl: e.audio,
                encodingFormat: "audio/mpeg",
                ...(e.isoDuration ? { duration: e.isoDuration } : {}),
              }
            : undefined,
          // Reference the canonical Person by @id only. The full record —
          // jobTitle, description, sameAs, image — lives at
          // https://suedeai.ai/founder and is supplied from there. Restating a
          // name/url-only copy of it on 30+ episode pages puts a thin duplicate
          // of the person in front of search and answer engines far more often
          // than the rich original, which is how a satellite ends up outranking
          // the node it was meant to point at.
          ...(credit ? credit.properties : { author: { "@id": PERSON_ID } }),
        },
        {
          "@type": "PodcastSeries",
          "@id": `${SITE}/#podcast`,
          name: "AI Suede: Build, Create, Ship",
          url: `${SITE}/`,
          webFeed: `${SITE}/feed.xml`,
        },
        ...pageNodes({
          url: e.url,
          name: pageTitle(e),
          description: e.metaDescription,
          crumbs: [{ name: e.title, item: e.url }],
          extra: {
            mainEntity: { "@id": `${e.url}#episode` },
            ...(e.iso ? { datePublished: e.iso } : {}),
          },
        }),
        ...(credit ? credit.nodes : []),
      ],
    },
    null,
    2,
  );
};

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
      h2 { font-size:clamp(20px,3vw,26px); line-height:1.25; margin:32px 0 12px; }
      .meta { color:var(--muted); font-size:14px; margin:0 0 28px; }
      .credit { margin:0 0 28px; padding:12px 14px; border:1px solid var(--line);
        border-radius:8px; background:var(--panel); font-size:15px; }
      .notes p { margin:0 0 14px; }
      .notes ul { margin:0 0 14px; padding-left:22px; }
      .notes li, ol.chapters li, ul.related-list li, ul.products li { margin:6px 0; }
      ol.chapters { margin:0 0 14px; padding-left:22px; }
      ol.chapters a { font-variant-numeric: tabular-nums; }
      .topics { font-size:15px; margin:-12px 0 24px; }
      ul.related-list, ul.products { margin:0; padding-left:20px; }
      .summary { display:block; font-size:15px; }
      .ep-meta { display:block; color:var(--muted); font-size:13px; }
      nav.pager { display:flex; flex-wrap:wrap; gap:8px 24px; margin:32px 0 0; font-size:15px; }
      audio { width:100%; margin:20px 0 28px; }
      nav.crumbs { font-size:14px; color:var(--muted); margin-bottom:24px; }
      nav.footer-nav { display:flex; flex-wrap:wrap; gap:6px 10px; margin:2px 0 0 -8px;
        font-size:14px; }
      nav.footer-nav a { padding:10px 8px; color:var(--muted); text-decoration:none; }
      hr { border:0; border-top:1px solid var(--line); margin:36px 0; }`;

/** One-line credit for an episode listed on another page, from appearances.mjs. */
const creditLabel = (e) =>
  creditSentence(e.slug) ?? guestSentence(e.slug) ?? "Episode by Jason Colapietro.";

const dateAndLength = (e) =>
  [e.date ? esc(e.date) : "", e.duration ? esc(e.duration) : ""].filter(Boolean).join(" &middot; ");

const topicLinks = (hubs) =>
  hubs.map((h) => `<a href="${topicPath(h.slug)}">${esc(h.name)}</a>`).join(", ");

const chaptersSection = (e, chapters) => `      <section class="notes-section">
        <h2>Episode chapters</h2>
        <p class="ep-meta">${esc(chapters.intro)}</p>
        <ol class="chapters">
${chapters.items
  .map(
    (c) =>
      `          <li><a href="${esc(youtubeAt(e, c.start))}">${esc(c.stamp)}</a> ${esc(c.title)}</li>`,
  )
  .join("\n")}
        </ol>${
          chapters.after
            ? `\n        <div class="notes">${renderNotes(chapters.after)}</div>`
            : ""
        }
      </section>`;

/**
 * Products the notes name, each with its live description (suede-sites.mjs) and
 * the naming lines, labelled with the date the notes were published so a line
 * from older notes is not read as the product's description today. A legal-effect claim is
 * never quoted here (topics.mjs); the product is still listed, as "named".
 */
const productsSection = (e, mentions) => {
  const published = e.date ? `, published ${esc(e.date)}` : "";
  return `      <section class="notes-section">
        <h2>Suede AI products in this episode</h2>
        <ul class="products">
${mentions
  .map(
    ({ product, lines }) => `          <li>
            <a href="${esc(product.href)}">${esc(product.name)}</a>. ${esc(product.description)}
            <span class="ep-meta">${
              lines.length
                ? `In the show notes${published}: ${lines.map((l) => `&ldquo;${esc(l)}&rdquo;`).join(" ")}`
                : `Named in the show notes${published}.`
            }</span>
          </li>`,
  )
  .join("\n")}
        </ul>
      </section>`;
};

const relatedSection = (e, all) => `      <section class="notes-section">
        <h2>Related episodes</h2>
        <p class="ep-meta">Chosen by the topics, hosts and keywords their show notes share with this episode, then by publish date.</p>
        <ul class="related-list">
${relatedEpisodes(e, all)
  .map(
    ({ episode: r, sharedHubs }) => `          <li>
            <a href="/episodes/${r.slug}">${esc(r.title)}</a>
            <span class="ep-meta">${dateAndLength(r)}${dateAndLength(r) ? " &middot; " : ""}${esc(creditLabel(r))}</span>${
              looksLikeStub(r.description) ? "" : `\n            <span class="summary">${esc(r.listSummary)}</span>`
            }${
              sharedHubs.length
                ? `\n            <span class="ep-meta">Shared topics: ${sharedHubs.map((h) => esc(h.name)).join(", ")}</span>`
                : ""
            }
          </li>`,
  )
  .join("\n")}
        </ul>
      </section>`;

/** Earlier and later episode by feed number; the feed lists newest first. */
const pager = (e, all) => {
  const i = all.indexOf(e);
  const later = i > 0 ? all[i - 1] : null;
  const earlier = i >= 0 && i < all.length - 1 ? all[i + 1] : null;
  const link = (label, x) =>
    `<a href="/episodes/${x.slug}">${label}${x.number ? ` (episode ${esc(x.number)})` : ""}: ${esc(x.title)}</a>`;
  const links = [earlier && link("Earlier", earlier), later && link("Later", later)].filter(Boolean);
  return links.length
    ? `      <nav class="pager" aria-label="Earlier and later episodes">\n        ${links.join("\n        ")}\n      </nav>`
    : "";
};

const episodePage = (e, all) => {
  const { notes, chapters } = episodeContent(e);
  const hubs = topicsFor(e);
  const mentions = productsFor(e);
  return `<!doctype html>
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
${hubs.length ? `      <p class="topics">Topics: ${topicLinks(hubs)}</p>\n` : ""}${
  // An appearance points at /appearances; an episode of his own with a named
  // guest says so and points nowhere, because it is not an appearance.
  creditSentence(e.slug)
    ? `      <p class="credit">${esc(creditSentence(e.slug))}
        <a href="/appearances">All appearances</a>.
      </p>`
    : guestSentence(e.slug)
      ? `      <p class="credit">${esc(guestSentence(e.slug))}</p>`
      : ""
}
      ${e.audio ? `<audio controls preload="none" src="${esc(e.audio)}"></audio>` : ""}
      <section class="notes-section">
        <h2>Episode show notes</h2>
        <div class="notes">${renderNotes(notes)}</div>
      </section>
${[
  chapters ? chaptersSection(e, chapters) : "",
  mentions.length ? productsSection(e, mentions) : "",
  relatedSection(e, all),
  pager(e, all),
]
  .filter(Boolean)
  .join("\n")}
      <hr />
      <p class="meta">
${
  // An appearance is carried on this feed, not authored for it. Saying "by
  // Jason Colapietro" under someone else's episode is the same false claim the
  // JSON-LD used to make.
  creditSentence(e.slug)
    ? `        Carried on <a href="/">AI Suede: Build, Create, Ship</a>.`
    : `        From <a href="/">AI Suede: Build, Create, Ship</a> by
        <a href="https://suedeai.ai/founder">Jason Colapietro</a>.`
}
        Subscribe via <a href="/feed.xml">RSS</a>.
      </p>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/appearances">Appearances</a>
        <a href="/contact">Contact</a>
        <a href="https://suedeai.ai/privacy">Privacy</a>
      </nav>
    </main>
  </body>
</html>
`;
};

// ---------------------------------------------------------------------------
// /topics/<slug> — one page per subject several episodes' notes cover.
//
// Every episode page used to stand alone: a recording about on-chain royalties
// had no route to the six others about the same thing, except the full list on
// the home page. A hub lists every recording whose show notes cover the topic
// (topics.mjs decides, from the notes), with its summary and the notes' own
// lines on the subject, so each page answers "which episodes cover X?" from
// the feed's own words.
// ---------------------------------------------------------------------------

const hubUrl = (hub) => `${SITE}${topicPath(hub.slug)}`;

const totalLength = (episodes) => {
  const minutes = Math.round(episodes.reduce((t, e) => t + toSeconds(e.duration || 0), 0) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} hour${h === 1 ? "" : "s"}` : "", m ? `${m} minute${m === 1 ? "" : "s"}` : ""]
    .filter(Boolean)
    .join(" ");
};

const hubJsonLd = (hub, members) =>
  JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${hubUrl(hub)}#webpage`,
          url: hubUrl(hub),
          name: hub.title,
          description: hub.description(members.length),
          keywords: keywordContent(PAGE_KEYWORDS[topicPath(hub.slug)]),
          isPartOf: { "@id": `${SITE}/#podcast` },
          publisher: { "@id": ORG_ID },
          inLanguage: "en-US",
          breadcrumb: breadcrumbList([{ name: hub.name, item: hubUrl(hub) }]),
          mainEntity: { "@id": `${hubUrl(hub)}#list` },
        },
        {
          "@type": "ItemList",
          "@id": `${hubUrl(hub)}#list`,
          name: hub.name,
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: members.length,
          itemListElement: members.map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: e.url,
            item: { "@id": `${e.url}#episode` },
          })),
        },
        {
          "@type": "PodcastSeries",
          "@id": `${SITE}/#podcast`,
          name: "AI Suede: Build, Create, Ship",
          url: `${SITE}/`,
          webFeed: `${SITE}/feed.xml`,
        },
      ],
    },
    null,
    2,
  );

/**
 * Why an entry is on the hub, when neither a quote nor its summary shows it:
 * the hub matched its title, or a notes line that is not quoted here (a
 * legal-effect claim, see topics.mjs) and stays on the episode page.
 */
const hubReason = (hub, e, summary, quotes) => {
  if (quotes.length || hub.match.test(summary)) return "";
  if (hub.match.test(proseLine(e.title))) return "Listed for its title.";
  return "Listed for a line of its show notes; the full notes are on the episode page.";
};

const hubEntry = (hub, e) => {
  const summary = hubSummary(e);
  const quotes = topicQuotes(e, hub).filter((q) => !cleanText(summary).includes(cleanText(q)));
  const reason = hubReason(hub, e, summary, quotes);
  return `      <section class="hub-ep">
        <h2><a href="/episodes/${e.slug}">${esc(e.title)}</a></h2>
        <span class="ep-meta">${e.number ? `Episode ${esc(e.number)} &middot; ` : ""}${dateAndLength(e)}${dateAndLength(e) ? " &middot; " : ""}${esc(creditLabel(e))}</span>
        <p>${esc(summary)}</p>${
          quotes.length
            ? `\n        <p class="ep-meta">On this topic, from the show notes:</p>\n        <ul class="quotes">\n${quotes
                .map((q) => `          <li>${esc(q)}</li>`)
                .join("\n")}\n        </ul>`
            : ""
        }${reason ? `\n        <p class="ep-meta">${esc(reason)}</p>` : ""}
      </section>`;
};

const hubPage = (hub, members, hubs, episodes) => {
  const appearances = members.filter((e) => creditSentence(e.slug)).length;
  const own = members.length - appearances;
  const dates = members.map((e) => e.date).filter(Boolean).sort();
  const product = hub.product ? productByKey(hub.product) : null;
  const others = hubs.filter((h) => h.slug !== hub.slug);
  const desc = hub.description(members.length);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(hub.title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta name="keywords" content="${esc(keywordContent(PAGE_KEYWORDS[topicPath(hub.slug)]))}" />
    <link rel="canonical" href="${hubUrl(hub)}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link
      rel="alternate"
      type="application/rss+xml"
      title="AI Suede: Build, Create, Ship"
      href="${SITE}/feed.xml"
    />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="AI Suede Podcast" />
    <meta property="og:title" content="${esc(hub.title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${hubUrl(hub)}" />
${socialImageTags()}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@AISUEDE" />
    <meta name="twitter:creator" content="@johnnysuede" />
    <meta name="twitter:title" content="${esc(hub.title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${SOCIAL_IMAGE.url}" />
    <script type="application/ld+json">
${hubJsonLd(hub, members)}
    </script>
    <style>
${STYLE}
      .lede { font-size:17px; margin:0 0 12px; }
      .hub-ep { margin:0 0 28px; padding:18px 20px; border:1px solid var(--line);
        border-radius:10px; background:var(--panel); }
      .hub-ep h2 { margin:0 0 4px; font-size:20px; }
      .hub-ep p { margin:10px 0 0; }
      .hub-ep ul.quotes { margin:6px 0 0; padding-left:20px; }
      .hub-ep ul.quotes li { margin:4px 0; }
      .product { margin:0 0 32px; padding:12px 14px; border:1px solid var(--line);
        border-radius:8px; font-size:15px; }
      ul.topic-list { padding-left:20px; }
      ul.topic-list li { margin:8px 0; }
    </style>
  </head>
  <body>
    <main>
      <nav class="crumbs"><a href="/">AI Suede Podcast</a> &rsaquo; Topic</nav>
      <p class="eyebrow">Topic</p>
      <h1>${esc(hub.name)}</h1>
      <p class="lede">${esc(hub.lede)}</p>
      <p class="meta">
        ${members.length} recordings: ${[
          own ? `${own} episode${own === 1 ? "" : "s"} of AI Suede` : "",
          appearances
            ? `${appearances} guest appearance${appearances === 1 ? "" : "s"} on other programmes (<a href="/appearances">see all appearances</a>)`
            : "",
        ]
          .filter(Boolean)
          .join(" and ")},
        published ${esc(dates[0])} to ${esc(dates[dates.length - 1])}, ${esc(totalLength(members))} of audio in all.
        Newest first. Each entry gives the episode's summary, then quotes the other lines of its show notes on the topic or says why it is listed.
      </p>
${
  product
    ? `      <p class="product">
        <a href="${esc(product.href)}">${esc(product.name)}</a>. ${esc(product.description)}
        <span class="ep-meta">Named in the show notes of ${
          members.filter((e) => productsFor(e).some((m) => m.product.key === product.key)).length
        } of these recordings.</span>
      </p>\n`
    : ""
}${members.map((e) => hubEntry(hub, e)).join("\n")}
      <section class="notes-section">
        <h2>Other topics</h2>
        <ul class="topic-list">
${others
  .map(
    (h) =>
      `          <li><a href="${topicPath(h.slug)}">${esc(h.name)}</a>: ${hubEpisodes(h, episodes).length} recordings. ${esc(h.short)}</li>`,
  )
  .join("\n")}
        </ul>
      </section>
      <hr />
      <p class="meta">
        From <a href="/">AI Suede: Build, Create, Ship</a>, the podcast feed of the
        <a href="https://www.youtube.com/@aisuede">@aisuede YouTube channel</a>.
        Subscribe via <a href="/feed.xml">RSS</a>.
      </p>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/appearances">Appearances</a>
        <a href="/contact">Contact</a>
        <a href="https://suedeai.ai/privacy">Privacy</a>
      </nav>
    </main>
  </body>
</html>
`;
};

// ---------------------------------------------------------------------------
// /appearances — one page listing every appearance on someone else's programme.
//
// The appearances existed only as 20 pages scattered through /episodes, each
// looking like an episode of his own show. There was no single URL a journalist
// or an answer engine could cite for "where has Jason Colapietro appeared?", so
// the answer had to be assembled from 33 pages or not given at all. This is
// that URL: a CollectionPage whose `about` is the canonical Person and whose
// ItemList carries every appearance, grouped by who hosted it.
// ---------------------------------------------------------------------------

const APPEARANCES_TITLE = "Podcast appearances | Jason Colapietro";
const APPEARANCES_DESC =
  "Guest appearances by Jason Colapietro (Johnny Suede) of Suede AI on other people's " +
  "podcasts, AMAs and Spaces, grouped by show with links to each recording.";

const appearancesJsonLd = (groups) => {
  const items = groups.flatMap((g) => g.episodes.map(({ episode }) => episode));
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${APPEARANCES_URL}#webpage`,
          url: APPEARANCES_URL,
          name: APPEARANCES_TITLE,
          description: APPEARANCES_DESC,
          isPartOf: { "@id": `${SITE}/#podcast` },
          publisher: { "@id": ORG_ID },
          inLanguage: "en-US",
          breadcrumb: breadcrumbList([{ name: "Appearances", item: APPEARANCES_URL }]),
          about: { "@id": PERSON_ID },
          mainEntity: { "@id": `${APPEARANCES_URL}#list` },
        },
        {
          "@type": "ItemList",
          "@id": `${APPEARANCES_URL}#list`,
          name: "Podcast and AMA appearances",
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: items.length,
          itemListElement: items.map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: e.url,
            item: { "@id": `${e.url}#episode` },
          })),
        },
        {
          "@type": "PodcastSeries",
          "@id": `${SITE}/#podcast`,
          name: "AI Suede: Build, Create, Ship",
          url: `${SITE}/`,
          webFeed: `${SITE}/feed.xml`,
        },
        // The hosts and programmes themselves, so this page is where the
        // third-party entities are described rather than only referenced.
        ...allCreditNodes(),
      ],
    },
    null,
    2,
  );
};

const appearancesPage = (groups) => {
  const total = groups.reduce((n, g) => n + g.episodes.length, 0);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(APPEARANCES_TITLE)}</title>
    <meta name="description" content="${esc(APPEARANCES_DESC)}" />
    <meta name="keywords" content="${esc(keywordContent(PAGE_KEYWORDS["/appearances"]))}" />
    <link rel="canonical" href="${APPEARANCES_URL}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link
      rel="alternate"
      type="application/rss+xml"
      title="AI Suede: Build, Create, Ship"
      href="${SITE}/feed.xml"
    />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="AI Suede Podcast" />
    <meta property="og:title" content="${esc(APPEARANCES_TITLE)}" />
    <meta property="og:description" content="${esc(APPEARANCES_DESC)}" />
    <meta property="og:url" content="${APPEARANCES_URL}" />
${socialImageTags()}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@AISUEDE" />
    <meta name="twitter:creator" content="@johnnysuede" />
    <meta name="twitter:title" content="${esc(APPEARANCES_TITLE)}" />
    <meta name="twitter:description" content="${esc(APPEARANCES_DESC)}" />
    <meta name="twitter:image" content="${SOCIAL_IMAGE.url}" />
    <script type="application/ld+json">
${appearancesJsonLd(groups)}
    </script>
    <style>
${STYLE}
      .lede { color:var(--muted); font-size:17px; margin:0 0 32px; }
      .show { margin:0 0 32px; padding:18px 20px; border:1px solid var(--line);
        border-radius:10px; background:var(--panel); }
      .show h2 { margin:0 0 4px; font-size:20px; }
      .show .handle { color:var(--muted); font-size:13px; margin:0 0 14px; }
      .show ul { margin:0; padding-left:20px; }
      .show li { margin:8px 0; }
      .show .ep-meta { display:block; color:var(--muted); font-size:13px; }
      nav.footer-nav { display:flex; flex-wrap:wrap; gap:6px 10px; margin:2px 0 0 -8px;
        font-size:14px; }
      nav.footer-nav a { padding:10px 8px; }
    </style>
  </head>
  <body>
    <main>
      <nav class="crumbs"><a href="/">AI Suede Podcast</a> &rsaquo; Appearances</nav>
      <p class="eyebrow">Appearances</p>
      <h1>Where Jason Colapietro has been a guest</h1>
      <p class="lede">
        ${total} recording${total === 1 ? "" : "s"} across ${groups.length} third-party programme${groups.length === 1 ? "" : "s"}: podcasts,
        exchange AMAs and Spaces hosted by other people. Each is carried on the
        <a href="/">AI Suede</a> feed, but the show and the host are theirs.
        Episodes made for this feed are listed on the <a href="/">home page</a>.
      </p>
${groups
  .map(
    (g) => `      <section class="show">
        <h2>${esc(g.name)}</h2>
        <p class="handle">${
          g.url
            ? `<a href="${esc(g.url)}">${esc(g.handle ?? g.url)}</a> &middot; `
            : g.handle
              ? `${esc(g.handle)} &middot; `
              : ""
        }${g.episodes.length} appearance${g.episodes.length === 1 ? "" : "s"}</p>
        <ul>
${g.episodes
  .map(
    ({ episode: e }) =>
      `          <li>\n            <a href="/episodes/${e.slug}">${esc(e.title)}</a>\n            <span class="ep-meta">${e.date ? esc(e.date) : ""}${e.date && e.duration ? " &middot; " : ""}${e.duration ? esc(e.duration) : ""}</span>\n          </li>`,
  )
  .join("\n")}
        </ul>
      </section>`,
  )
  .join("\n")}
      <hr />
      <p class="meta">
        Credits on this page are taken from the show notes of the recording they
        name; where the notes do not say whose programme a conversation was, it is
        not listed here.
        <nav class="footer-nav" aria-label="Footer">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="https://suedeai.ai/founder">Jason Colapietro</a>
          <a href="https://suedeai.ai">Suede AI</a>
          <a href="https://suedeai.ai/privacy">Privacy</a>
        </nav>
      </p>
    </main>
  </body>
</html>
`;
};

/** Visible text of a static page's <main>, one paragraph per block element. */
const pageText = (rel) => {
  const html = readFileSync(join(PUBLIC, rel), "utf8");
  const body = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/) ?? [, ""])[1]
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<nav\b[\s\S]*?<\/nav>/g, "")
    .replace(/<div class="actions">[\s\S]*?<\/div>/g, "")
    .replace(/<(?:section|picture)\b[\s\S]*?<\/(?:section|picture)>/g, "");
  return body
    .split(/<\/(?:p|h1|h2|h3|li)>/)
    .map((chunk) =>
      chunk
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&middot;/g, "·")
        .replace(/&rsaquo;/g, "›")
        .replace(/&mdash;/g, ",")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;|&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+([.,;:])/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
};

/** Show notes as plain text: the feed's own copy, bullets kept as list lines. */
const notesText = (e) => {
  const { notes, chapters } = episodeContent(e);
  const lines = String(notes)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .map((l) => (BULLET_LINE.test(l) ? `- ${l.replace(BULLET_LINE, "")}` : l));
  const out = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!chapters) return out;
  const marks = chapters.items.map((c) => `- ${c.stamp} ${c.title}`).join("\n");
  return `${out}\n\nChapters:\n${marks}${chapters.after ? `\n\n${chapters.after.trim()}` : ""}`;
};

export const llmsFull = (episodes, hubs, groups) => {
  const appearanceCount = groups.reduce((n, g) => n + g.episodes.length, 0);
  const parts = [
    "# AI Suede Podcast: full text",
    "",
    "> The complete public text of podcast.suedeai.ai: the show, its host, every episode's show notes, the topic hubs and the guest appearances index. Generated from the podcast feed at build time, so it matches the published pages.",
    "",
    `- Show: ${SHOW}`,
    "- Host: Jason Colapietro (also known as Johnny Suede), founder of Suede AI: https://suedeai.ai/founder",
    "- Publisher: Suede AI (also known as Suede Labs): https://suedeai.ai",
    `- Site: ${SITE}/`,
    `- RSS feed: ${SITE}/feed.xml`,
    "- Apple Podcasts: https://podcasts.apple.com/us/podcast/ai-suede-build-create-ship/id6787263913",
    "- YouTube: https://www.youtube.com/@aisuede",
    `- Episodes: ${episodes.length}, of which ${appearanceCount} are guest appearances on other people's programmes`,
    `- Short index: ${SITE}/llms.txt`,
    "",
    "## About the podcast",
    "",
    `Source: ${SITE}/about`,
    "",
    pageText("about.html"),
    "",
    "## Contact",
    "",
    `Source: ${SITE}/contact`,
    "",
    pageText("contact.html"),
    "",
    "## Topics",
    "",
    ...hubs.flatMap(({ hub, members }) => [
      `### ${hub.name}`,
      "",
      `Source: ${hubUrl(hub)}`,
      "",
      hub.lede,
      "",
      ...members.map((e) => `- [${e.title}](${e.url})${e.date ? `, ${e.date}` : ""}`),
      "",
    ]),
    "## Guest appearances",
    "",
    `Source: ${APPEARANCES_URL}`,
    "",
    ...groups.flatMap((g) => [
      `### ${g.name}`,
      "",
      ...g.episodes.map(({ episode: e }) => `- [${e.title}](${e.url})${e.date ? `, ${e.date}` : ""}`),
      "",
    ]),
    "## Episodes",
    "",
    "Newest first. Each entry gives the episode's published date, length, credit and full show notes.",
    "",
    ...episodes.flatMap((e) => [
      `### ${e.title}`,
      "",
      `- URL: ${e.url}`,
      ...(e.number ? [`- Episode: ${e.number}`] : []),
      ...(e.date ? [`- Published: ${e.date}`] : []),
      ...(e.duration ? [`- Length: ${e.duration}`] : []),
      `- Credit: ${creditLabel(e)}`,
      ...(topicsFor(e).length ? [`- Topics: ${topicsFor(e).map((h) => h.name).join(", ")}`] : []),
      ...(e.audio ? [`- Audio: ${e.audio}`] : []),
      "",
      notesText(e),
      "",
    ]),
  ];
  return `${parts.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
};

const main = () => {
  const xml = readFileSync(join(PUBLIC, "feed.xml"), "utf8");
  const episodes = parseEpisodes(xml);
  if (!episodes.length) {
    console.error("build-episodes: no <item> entries in feed.xml — refusing to wipe episodes/");
    process.exit(1);
  }

  // A hub too small to be worth a page fails the build rather than shipping a
  // thin one. Checked before anything is written, so a failed build leaves
  // public/ exactly as it was instead of half regenerated.
  const hubs = TOPIC_HUBS.map((hub) => ({ hub, members: hubEpisodes(hub, episodes) }));
  for (const { hub, members } of hubs) {
    if (members.length < MIN_HUB_EPISODES) {
      console.error(
        `build-episodes: topic ${hub.slug} matches ${members.length} episodes (minimum ${MIN_HUB_EPISODES}); ` +
          "drop it from TOPIC_HUBS or widen its match",
      );
      process.exit(1);
    }
  }

  // Regenerate cleanly so a retitled episode does not leave a stale page behind.
  if (existsSync(EPISODES_DIR)) rmSync(EPISODES_DIR, { recursive: true });
  mkdirSync(EPISODES_DIR, { recursive: true });
  for (const e of episodes) {
    writeFileSync(join(EPISODES_DIR, `${e.slug}.html`), episodePage(e, episodes));
  }

  // /topics/<slug> — rebuilt from scratch like /episodes, so a hub dropped from
  // TOPIC_HUBS takes its page with it.
  if (existsSync(TOPICS_DIR)) rmSync(TOPICS_DIR, { recursive: true });
  mkdirSync(TOPICS_DIR, { recursive: true });
  for (const { hub, members } of hubs) {
    writeFileSync(join(TOPICS_DIR, `${hub.slug}.html`), hubPage(hub, members, TOPIC_HUBS, episodes));
  }

  // /appearances — regenerated from the same feed, so the index and the episode
  // pages can never disagree about who hosted what.
  const groups = groupAppearances(episodes);
  const appearancesDir = join(PUBLIC, "appearances");
  mkdirSync(appearancesDir, { recursive: true });
  writeFileSync(join(appearancesDir, "index.html"), appearancesPage(groups));

  // Sitemap: the static pages, the topic hubs, and every episode.
  // `file` is the page's source, dated by the same content rule as the episodes.
  const staticUrls = [
    { loc: `${SITE}/ai-instructions`, file: join("public", "ai-instructions.html"), changefreq: "monthly", priority: "0.4" },
    { loc: `${SITE}/`, file: join("public", "index.html"), changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE}/about`, file: join("public", "about.html"), changefreq: "monthly", priority: "0.5" },
    { loc: `${SITE}/appearances`, file: join("public", "appearances", "index.html"), changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE}/contact`, file: join("public", "contact.html"), changefreq: "monthly", priority: "0.5" },
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${contentDate(u.file)}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
  )
  .join("\n")}
${hubs
  .map(
    ({ hub }) =>
      `  <url>\n    <loc>${hubUrl(hub)}</loc>\n    <lastmod>${contentDate(join("public", "topics", `${hub.slug}.html`))}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`,
  )
  .join("\n")}
${episodes
  .map(
    (e) =>
      `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${pageLastmod(e)}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
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
          <p class="ep-meta">
            ${groups.reduce((n, g) => n + g.episodes.length, 0)} of these are guest appearances on other people's shows.
            <a href="/appearances">See them grouped by host</a>.
          </p>
          <ol class="episode-list">
${episodes
  .map(
    (e) =>
      `            <li>\n              <a href="/episodes/${e.slug}">${esc(e.title)}</a>\n              <span class="ep-meta">${e.date ? esc(e.date) : ""}${e.date && e.duration ? " &middot; " : ""}${e.duration ? esc(e.duration) : ""}</span>\n            </li>`,
  )
  .join("\n")}
          </ol>
        </section>`;

  // Topic hubs on the homepage, above the episode list, so each hub is one
  // followed link from the root.
  const topicsHtml = `        <section class="topics" aria-labelledby="topics-heading">
          <h2 id="topics-heading">Browse by topic</h2>
          <ul class="topic-list">
${hubs
  .map(
    ({ hub, members }) =>
      `            <li>\n              <a href="${topicPath(hub.slug)}">${esc(hub.name)}</a>\n              <span class="ep-meta">${members.length} recordings. ${esc(hub.short)}</span>\n            </li>`,
  )
  .join("\n")}
          </ul>
        </section>`;

  const indexPath = join(PUBLIC, "index.html");
  let index = readFileSync(indexPath, "utf8");
  const T_START = "<!-- TOPICS:START -->";
  const T_END = "<!-- TOPICS:END -->";
  const topicsBlock = `${T_START}\n${topicsHtml}\n        ${T_END}`;
  if (index.includes(T_START)) {
    index = index.replace(new RegExp(`${T_START}[\\s\\S]*?${T_END}`), topicsBlock);
  } else {
    index = index.replace("      <!-- EPISODES:START -->", `      ${topicsBlock}\n      <!-- EPISODES:START -->`);
  }
  if (!index.includes(".topic-list")) {
    index = index.replace(
      "    </style>",
      `      .topics { margin-top: 48px; }
      .topic-list { list-style: none; padding-left: 0; }
      .topic-list li { margin: 12px 0; }
    </style>`,
    );
  }
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

  // llms-full.txt: the full text of the site for answer engines, generated from
  // the same feed and tables as the pages so the two cannot drift.
  writeFileSync(join(PUBLIC, "llms-full.txt"), llmsFull(episodes, hubs, groups));

  console.log(`build-episodes: ${episodes.length} episode pages`);
  console.log(
    `build-episodes: ${groups.reduce((n, g) => n + g.episodes.length, 0)} appearances across ` +
      `${groups.length} third-party programmes`,
  );
  console.log(`build-episodes: ${hubs.length} topic hubs (${hubs.map(({ hub, members }) => `${hub.slug} ${members.length}`).join(", ")})`);
  console.log(`build-episodes: sitemap ${staticUrls.length + hubs.length + episodes.length} URLs`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

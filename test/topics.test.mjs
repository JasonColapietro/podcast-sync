import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { cleanText, hubSummary, parseEpisodes, videoId } from "../build-episodes.mjs";
import { MIN_HUB_EPISODES, TOPIC_HUBS, topicPath } from "../keywords.mjs";
import { LEGAL_EFFECT_CLAIM, PRODUCTS } from "../suede-sites.mjs";
import { hubEpisodes, productsFor, proseLine, relatedEpisodes, topicsFor } from "../topics.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");
const SITE = "https://podcast.suedeai.ai";
const feed = readFileSync(join(PUBLIC, "feed.xml"), "utf8");
const episodes = parseEpisodes(feed);
const bySlug = new Map(episodes.map((e) => [e.slug, e]));
const read = (rel) => readFileSync(join(PUBLIC, rel), "utf8");
const episodeHtml = (e) => read(join("episodes", `${e.slug}.html`));
const hubHtml = (hub) => read(join("topics", `${hub.slug}.html`));

const unesc = (s) =>
  s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const meta = (html, name) =>
  unesc(html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`))?.[1] ?? "");
const titleOf = (html) => unesc(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
const hrefs = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => unesc(m[1]));
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

/** Every indexable HTML page and the URL it claims. */
const PAGES = [
  ["index.html", `${SITE}/`],
  ["about.html", `${SITE}/about`],
  ["contact.html", `${SITE}/contact`],
  ["ai-instructions.html", `${SITE}/ai-instructions`],
  ["appearances/index.html", `${SITE}/appearances`],
  ...TOPIC_HUBS.map((h) => [join("topics", `${h.slug}.html`), `${SITE}${topicPath(h.slug)}`]),
  ...episodes.map((e) => [join("episodes", `${e.slug}.html`), e.url]),
];

test("no topic page ships without its hub, and no hub is too thin to be a page", () => {
  const files = readdirSync(join(PUBLIC, "topics")).sort();
  assert.deepEqual(files, TOPIC_HUBS.map((h) => `${h.slug}.html`).sort());
  for (const hub of TOPIC_HUBS) {
    assert.ok(
      hubEpisodes(hub, episodes).length >= MIN_HUB_EPISODES,
      `${hub.slug} has fewer than ${MIN_HUB_EPISODES} episodes`,
    );
  }
});

test("a hub below the minimum fails the build before any file is written", () => {
  // Run the builder on a scratch copy whose feed keeps one episode, so every hub
  // falls below MIN_HUB_EPISODES, and check public/ is left exactly as it was.
  const root = join(__dirname, "..");
  const dir = mkdtempSync(join(tmpdir(), "build-episodes-"));
  try {
    for (const f of readdirSync(root)) {
      if (f.endsWith(".mjs") || f === "chapters.json") cpSync(join(root, f), join(dir, f));
    }
    const out = join(dir, "public");
    cpSync(PUBLIC, out, { recursive: true });
    const first = feed.match(/<item>[\s\S]*?<\/item>/)[0];
    writeFileSync(
      join(out, "feed.xml"),
      feed.slice(0, feed.indexOf("<item>")) + first + feed.slice(feed.lastIndexOf("</item>") + "</item>".length),
    );
    const snapshot = () =>
      readdirSync(out, { recursive: true })
        .sort()
        .map((rel) => {
          const stat = statSync(join(out, rel));
          return [rel, stat.mtimeMs, stat.isDirectory() ? null : readFileSync(join(out, rel)).toString("base64")];
        });
    const before = snapshot();

    const run = spawnSync(process.execPath, [join(dir, "build-episodes.mjs")], { cwd: dir, encoding: "utf8" });
    assert.equal(run.status, 1, `build should fail: ${run.stderr}`);
    assert.match(run.stderr, new RegExp(`matches [01] episodes \\(minimum ${MIN_HUB_EPISODES}\\)`));
    assert.deepEqual(snapshot(), before, "a failed build changed public/");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every indexable page has a unique title, description and self-referencing canonical", () => {
  const seen = { title: new Map(), description: new Map(), canonical: new Map() };
  for (const [rel, url] of PAGES) {
    const html = read(rel);
    assert.doesNotMatch(html, /<meta\s+name="robots"[^>]*noindex/i, `${rel} is noindex`);
    assert.equal(canonicalOf(html), url, `${rel} canonical`);
    const values = { title: titleOf(html), description: meta(html, "description"), canonical: url };
    for (const [key, value] of Object.entries(values)) {
      assert.ok(value, `${rel} has no ${key}`);
      assert.ok(!seen[key].has(value), `${rel} repeats the ${key} of ${seen[key].get(value)}`);
      seen[key].set(value, rel);
    }
  }
});

test("the sitemap lists every page once, and nothing that is not a page", () => {
  const sitemap = read("sitemap.xml");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length, "a URL is listed twice");
  assert.deepEqual([...locs].sort(), PAGES.map(([, url]) => url).sort());
});

for (const hub of TOPIC_HUBS) {
  const members = hubEpisodes(hub, episodes);

  test(`/topics/${hub.slug}: is linked from the home page, llms.txt and its episodes`, () => {
    assert.ok(hrefs(read("index.html")).includes(topicPath(hub.slug)), "home page does not link it");
    assert.ok(read("llms.txt").includes(`${SITE}${topicPath(hub.slug)}`), "llms.txt does not list it");
    for (const e of members) {
      assert.ok(hrefs(episodeHtml(e)).includes(topicPath(hub.slug)), `${e.slug} does not link its topic`);
    }
  });

  test(`/topics/${hub.slug}: lists exactly its episodes, quoting their own notes`, () => {
    const html = hubHtml(hub);
    assert.equal(titleOf(html), hub.title);
    assert.equal(meta(html, "description"), hub.description(members.length));

    const listed = hrefs(html).filter((h) => h.startsWith("/episodes/")).map((h) => h.slice(10));
    assert.deepEqual(listed, members.map((e) => e.slug));

    // Membership is the episode's own words: its title or a line of its notes,
    // leaving out link lines and sign-offs ("Stay connected ...").
    for (const e of episodes) {
      const lines = String(e.descriptionHtml)
        .split("\n")
        .filter((l) => !/https?:\/\//.test(l))
        .map(proseLine)
        .filter((l) => !/^(?:stay connected|stay tuned|don['’]t (?:miss|forget)|sit back|subscribe|follow\b|watch now|tune in)/i.test(l));
      assert.equal(
        members.includes(e),
        [proseLine(e.title), ...lines].some((w) => hub.match.test(w)),
        `${e.slug}: membership disagrees with its copy`,
      );
    }

    // Each quoted line is a line of that episode's feed copy.
    const sections = html.split('<section class="hub-ep">').slice(1);
    assert.equal(sections.length, members.length);
    let quoted = 0;
    sections.forEach((section, i) => {
      const e = members[i];
      const source = new Set(String(e.descriptionHtml).split("\n").map(proseLine));
      const list = section.split("</section>")[0].match(/<ul class="quotes">([\s\S]*?)<\/ul>/)?.[1] ?? "";
      const quotes = [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => unesc(m[1]));
      for (const q of quotes) assert.ok(source.has(q), `${e.slug}: quote not in the feed copy: ${q}`);
      quoted += quotes.length;
    });
    assert.ok(quoted > 0, "no quotes were checked");

    // Each summary is the notes' opening paragraph in full, quotes do not repeat
    // it, and an entry that quotes nothing on the topic says why it is listed.
    sections.forEach((section, i) => {
      const e = members[i];
      const body = section.split("</section>")[0];
      const summary = unesc(body.match(/<\/span>\s*<p>([\s\S]*?)<\/p>/)?.[1] ?? "");
      assert.equal(summary, hubSummary(e), `${e.slug}: hub summary`);
      assert.doesNotMatch(summary, /…$/, `${e.slug}: hub summary is cut short`);
      const list = body.match(/<ul class="quotes">([\s\S]*?)<\/ul>/)?.[1] ?? "";
      const quotes = [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => unesc(m[1]));
      for (const q of quotes) {
        assert.ok(!cleanText(summary).includes(cleanText(q)), `${e.slug}: quote repeats the summary`);
      }
      if (!quotes.length && !hub.match.test(summary)) {
        assert.match(body, /<p class="ep-meta">Listed for [^<]+<\/p>/, `${e.slug}: no quote and no reason`);
      }
    });

    const [data] = jsonLd(html);
    const list = data["@graph"].find((n) => n["@type"] === "ItemList");
    assert.equal(list.numberOfItems, members.length);
    assert.deepEqual(list.itemListElement.map((i) => i.url), members.map((e) => e.url));
    // A hub describes episodes; it restates no person or organisation.
    for (const node of data["@graph"]) {
      assert.ok(!["Person", "Organization"].includes(node["@type"]), "hub restates an entity");
      assert.ok(!("sameAs" in node), "hub carries sameAs");
    }
  });
}

test("product links go to live product sites the notes name, never to a demo or gated host", () => {
  for (const p of PRODUCTS) {
    assert.match(p.href, /^https:\/\/[a-z.]+\.(?:ai|social)$/);
    assert.doesNotMatch(p.href, /\/\/(?:ip|producer|webmcp)\.suedeai\.ai/);
    assert.ok(episodes.some((e) => productsFor(e).some((m) => m.product === p)), `${p.key} is named nowhere`);
  }
  for (const e of episodes) {
    const html = episodeHtml(e);
    const linked = PRODUCTS.filter((p) => hrefs(html).includes(p.href)).map((p) => p.key);
    assert.deepEqual(linked, productsFor(e).map((m) => m.product.key), `${e.slug} product links`);
  }
});

test("a legal-effect claim stays in its dated notes and is not repeated beside a product", () => {
  const claimed = episodes.filter((e) => LEGAL_EFFECT_CLAIM.test(e.descriptionHtml));
  assert.ok(claimed.length >= 3, "expected the court-enforceable lines in the feed");
  for (const e of claimed) {
    const html = episodeHtml(e);
    const notes = html.split("<h2>Episode show notes</h2>")[1].split("<h2>Suede AI products")[0];
    assert.match(notes, LEGAL_EFFECT_CLAIM, `${e.slug}: the notes lost their own line`);
  }
  for (const e of episodes) {
    const html = episodeHtml(e);
    if (!productsFor(e).length) continue;
    const block = html.split("<h2>Suede AI products in this episode</h2>")[1].split("</section>")[0];
    assert.doesNotMatch(block, LEGAL_EFFECT_CLAIM, `${e.slug}: product block repeats a legal-effect claim`);
    // Quotes from the notes carry the notes' own publish date.
    const labels = [...block.matchAll(/<span class="ep-meta">([^<]*)/g)].map((m) => m[1]);
    assert.equal(labels.length, productsFor(e).length);
    for (const label of labels) {
      assert.match(label, new RegExp(`^(?:In|Named in) the show notes, published ${e.date}[:.]`), `${e.slug}: ${label}`);
    }
  }
  for (const hub of TOPIC_HUBS) {
    assert.doesNotMatch(hubHtml(hub), LEGAL_EFFECT_CLAIM, `${hub.slug} repeats a legal-effect claim`);
  }
});

test("no page links a retired, gated or demo Suede host, or carries tracking parameters", () => {
  const files = [
    ...PAGES.map(([rel]) => rel),
    "llms.txt",
  ];
  for (const rel of files) {
    const text = read(rel);
    assert.doesNotMatch(text, /https?:\/\/(?:ip|producer|webmcp)\.suedeai\.ai/, `${rel} links a host it must not`);
    assert.doesNotMatch(text, /[?&](?:utm_[a-z]+|fbclid|gclid)=/i, `${rel} carries a tracking parameter`);
  }
});

test("chapter links open the episode's own upload at the stated time", () => {
  let checked = 0;
  for (const e of episodes) {
    const html = episodeHtml(e);
    const id = videoId(e);
    // The feed's own thumbnail for this item names the same upload.
    const item = feed.match(new RegExp(`<item>(?:(?!</item>)[\\s\\S])*?<guid[^>]*>${e.guid}</guid>[\\s\\S]*?</item>`))?.[0] ?? "";
    for (const m of html.matchAll(/<li><a href="(https:\/\/www\.youtube\.com\/watch\?[^"]+)">([\d:]+)<\/a>/g)) {
      const url = new URL(unesc(m[1]));
      assert.equal(url.searchParams.get("v"), id, `${e.slug}: chapter link to another video`);
      assert.ok(item.includes(`i.ytimg.com/vi/${id}/`), `${e.slug}: feed item does not carry this upload`);
      const seconds = m[2].split(":").map(Number).reduce((t, p) => t * 60 + p, 0);
      assert.equal(url.searchParams.get("t"), seconds ? `${seconds}s` : null, `${e.slug}: ${m[2]} link time`);
      checked += 1;
    }
  }
  assert.ok(checked >= 37, `expected the three chapter lists, checked ${checked} links`);
});

test("related episodes are deterministic, never self, and resolve to real pages", () => {
  for (const e of episodes) {
    const picks = relatedEpisodes(e, episodes).map((r) => r.episode.slug);
    assert.deepEqual(picks, relatedEpisodes(e, episodes).map((r) => r.episode.slug), "not deterministic");
    assert.equal(picks.length, 4);
    assert.ok(!picks.includes(e.slug), `${e.slug} relates to itself`);
    const section = episodeHtml(e).split("<h2>Related episodes</h2>")[1].split("</section>")[0];
    const linked = hrefs(section).map((h) => h.slice("/episodes/".length));
    assert.deepEqual(linked, picks);
    for (const slug of linked) assert.ok(bySlug.has(slug), `${slug} is not an episode`);
  }
});

test("an episode with topics links them; one without carries no topic line", () => {
  for (const e of episodes) {
    const html = episodeHtml(e);
    assert.equal(html.includes('<p class="topics">'), topicsFor(e).length > 0, e.slug);
  }
});

/**
 * Topic membership, related episodes and product mentions, all read from each
 * episode's own feed copy. Pure functions over parsed episodes (the objects
 * build-episodes.mjs's parseEpisodes() returns): no file I/O, no HTML.
 *
 * The rule is the same one appearances.mjs follows: nothing here is supplied
 * from outside the feed. An episode is in a topic hub because a line of its
 * notes (or its title) says so; a quote on a hub page is that line; a product
 * link appears because the notes name the product.
 */
import { APPEARANCES, HOSTED, PROGRAMMES } from "./appearances.mjs";
import { EPISODE_BASE, TOPIC_HUBS, episodeKeywords, isBrandTerm } from "./keywords.mjs";
import { LEGAL_EFFECT_CLAIM, PRODUCTS } from "./suede-sites.mjs";

const URL_IN_LINE = /https?:\/\//i;
// Sign-off lines ("Stay connected and be part of ...") ask the listener to
// follow the channel; like link lines, they say nothing about the episode.
const CALL_TO_ACTION = /^(?:stay connected|stay tuned|don['’]t (?:miss|forget)|sit back|subscribe|follow\b|watch now|tune in)/i;
const LEADING_BULLET = /^[•▪●◦‣·]\s*/u;

/** One line of notes as plain prose: no emoji, list glyphs, hashtags or bold markers. */
export const proseLine = (line) =>
  String(line)
    .replace(/\*\*|__/g, "")
    .replace(/(^|\s)#[A-Za-z0-9_]+/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\uFE0F\u200D\u20E3]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_BULLET, "")
    .trim();

/**
 * The episode's own words, one entry per line of its notes. Link lines (a URL
 * anywhere in the line), sign-off lines and lines that were only hashtags are
 * dropped: they say where to follow the show, not what the episode covers.
 */
export const proseLines = (e) =>
  String(e.descriptionHtml || "")
    .split(/\r?\n/)
    .filter((line) => !URL_IN_LINE.test(line))
    .map(proseLine)
    .filter((line) => /[A-Za-z]/.test(line) && !CALL_TO_ACTION.test(line));

const topicCache = new WeakMap();

/** The topic hubs an episode belongs to, in TOPIC_HUBS order. */
export const topicsFor = (e) => {
  if (!topicCache.has(e)) {
    const title = proseLine(e.title);
    const lines = proseLines(e);
    topicCache.set(
      e,
      TOPIC_HUBS.filter((hub) => hub.match.test(title) || lines.some((l) => hub.match.test(l))),
    );
  }
  return topicCache.get(e);
};

/** A notes line that pages built from the notes may quote (see LEGAL_EFFECT_CLAIM). */
export const quotable = (line) => !LEGAL_EFFECT_CLAIM.test(line);

/**
 * The lines of an episode's notes that put it in a hub, for quoting on the hub
 * page. A notes line that only repeats the title is left out, and so is a
 * legal-effect claim: the episode page carries that line in its dated notes.
 */
export const topicQuotes = (e, hub) => {
  const title = proseLine(e.title).toLowerCase();
  return proseLines(e).filter((l) => hub.match.test(l) && l.toLowerCase() !== title && quotable(l));
};

/** Episodes in a hub, newest first (the feed order). */
export const hubEpisodes = (hub, episodes) =>
  episodes.filter((e) => topicsFor(e).some((h) => h.slug === hub.slug));

/**
 * Suede AI products the notes name. `lines` are the naming lines a product
 * callout may quote; it can be empty when the only line that names the product
 * is a legal-effect claim, and the product is still listed, because the notes
 * still name it.
 */
export const productsFor = (e) =>
  PRODUCTS.flatMap((product) => {
    const naming = proseLines(e).filter((l) => product.match.test(l));
    return naming.length ? [{ product, lines: naming.filter(quotable) }] : [];
  });

/** The episode's keyword-map topic terms, without the brand and base terms. */
const topicTerms = (e) =>
  new Set(
    episodeKeywords(e)
      .filter((t) => !isBrandTerm(t) && !EPISODE_BASE.includes(t))
      .map((t) => t.toLowerCase()),
  );

/**
 * The third parties appearances.mjs credits on an episode: the hosts and the
 * programme of an appearance, or the guests of an episode he hosted. Two
 * recordings with the same host (four Block AMAs, say) are related even when
 * their notes share no topic words.
 */
const partiesOf = (e) => {
  const a = APPEARANCES[e.slug];
  if (a) {
    const p = a.programme ? PROGRAMMES[a.programme] : null;
    return new Set([...a.producers, p?.host, p?.publisher, a.programme && `programme:${a.programme}`].filter(Boolean));
  }
  return new Set(HOSTED[e.slug]?.guests ?? []);
};

const time = (e) => (e.iso ? Date.parse(e.iso) : 0);

/**
 * Related episodes, deterministic: score each other episode by shared topic
 * hubs (2 points each), shared credited hosts, programmes or guests (1 point
 * each) and shared keyword-map terms (1 point each), then break ties by the
 * nearest publish date, then by slug. Episodes that share nothing still rank by
 * date, so a page with thin notes gets the recordings published around it.
 */
export const relatedEpisodes = (e, episodes, n = 4) => {
  const hubs = new Set(topicsFor(e).map((h) => h.slug));
  const terms = topicTerms(e);
  const parties = partiesOf(e);
  const t0 = time(e);
  return episodes
    .filter((o) => o.slug !== e.slug)
    .map((o) => {
      const sharedHubs = topicsFor(o).filter((h) => hubs.has(h.slug));
      const sharedTerms = [...topicTerms(o)].filter((t) => terms.has(t));
      const sharedParties = [...partiesOf(o)].filter((k) => parties.has(k));
      return {
        episode: o,
        sharedHubs,
        score: 2 * sharedHubs.length + sharedParties.length + sharedTerms.length,
        gap: Math.abs(time(o) - t0),
      };
    })
    .sort((a, b) => b.score - a.score || a.gap - b.gap || a.episode.slug.localeCompare(b.episode.slug))
    .slice(0, n);
};

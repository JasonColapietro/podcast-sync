/**
 * Central keyword map for every indexable page on podcast.suedeai.ai.
 *
 * Each page emits `<meta name="keywords">` built from this file: a page-specific
 * list led by the page's primary term, plus at most ONE brand term, deduped
 * case-insensitively and capped at MAX_TERMS. Static pages (home, about,
 * contact) carry the tag in their hand-written HTML; episode pages and
 * /appearances get it from build-episodes.mjs. test/keywords.test.mjs fails if
 * any indexable page ships without the tag or drifts from this map.
 *
 * Terms come from the 2026-09-08 keyword research (brand + misc + music_rights
 * + agents groups) and from what each page actually discusses. No claims.
 */

/** The one brand term a page carries when its own list names no brand. */
export const BRAND_TERM = "AI Suede Podcast";

/** Any term naming the show, the company or the host counts as brand. */
export const isBrandTerm = (term) => /suede|jason colapietro/i.test(term);

export const MAX_TERMS = 10;

/**
 * Case-insensitive dedupe (first spelling wins), keep only the first brand
 * term, append BRAND_TERM when the list has none, then trim page-specific terms
 * from the end until the list fits MAX_TERMS.
 */
export const withBrand = (terms) => {
  const seen = new Set();
  const out = [];
  let hasBrand = false;
  for (const raw of terms) {
    const term = String(raw).replace(/\s+/g, " ").trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    if (isBrandTerm(term)) {
      if (hasBrand) continue;
      hasBrand = true;
    }
    seen.add(key);
    out.push(term);
  }
  if (!hasBrand) out.push(BRAND_TERM);
  while (out.length > MAX_TERMS) {
    const i = out.findLastIndex((t) => !isBrandTerm(t));
    out.splice(i, 1);
  }
  return out;
};

export const keywordContent = (terms) => withBrand(terms).join(", ");

/** Static and index pages, keyed by public path. */
export const PAGE_KEYWORDS = {
  "/": [
    "AI podcast for musicians",
    "AI music podcast",
    "music IP",
    "programmable media",
    "AI and music industry",
    "crypto AI podcast",
    "solo founder podcast",
  ],
  "/about": [
    "about the AI Suede Podcast",
    "podcast host",
    "music IP",
    "programmable media",
    "solo founder",
  ],
  "/contact": [
    "contact AI Suede Podcast",
    "podcast booking",
    "podcast guest request",
  ],
  "/appearances": [
    "Jason Colapietro podcast appearances",
    "guest appearances",
    "AMA recordings",
    "X Spaces",
    "crypto AI interviews",
    "AI music interviews",
  ],
};

/** Base term every episode page carries after its topic terms. */
const EPISODE_BASE = ["AI music podcast episode"];

/**
 * Topic rules: when an episode's title or summary matches, its terms are added.
 * Matching on the episode's own words keeps each page's list true to that page.
 */
const TOPIC_RULES = [
  [/\bmusic ip\b|\bip stack\b|own your ip|\bip\b/i, ["music IP", "music IP registry blockchain"]],
  [/royalt/i, ["on-chain royalties", "music royalties"]],
  [/\brwas?\b|real[- ]world asset/i, ["music RWA", "real-world assets"]],
  [/\bx402\b/i, ["x402 agent payments"]],
  [/\bagents?\b/i, ["AI agents"]],
  [/identity|likeness/i, ["artist identity", "AI likeness protection"]],
  [/rights|copyright/i, ["music rights", "music copyright"]],
  [/\bBase\b/, ["Base blockchain"]],
  [/avalanche|\bavax\b|subnet/i, ["Avalanche", "Avalanche subnet"]],
  [/chainlink/i, ["Chainlink"]],
  [/solana|\bsol\b/i, ["Solana"]],
  [/binance/i, ["Binance AMA"]],
  [/mario nawfal/i, ["Mario Nawfal", "Mario Nawfal show"]],
  [/coinmerge/i, ["CoinMerge"]],
  [/btse/i, ["BTSE"]],
  [/digifinex/i, ["DigiFinex"]],
  [/apex exchange/i, ["Apex Exchange"]],
  [/crypto shogun/i, ["Crypto Shogun"]],
  [/metaguardians/i, ["MetaGuardians"]],
  [/fity\.?eth/i, ["Fity.eth"]],
  [/\bama\b/i, ["crypto AMA"]],
  [/x spaces|\bspace\b/i, ["X Spaces"]],
  [/web3/i, ["web3 music"]],
  [/crypto/i, ["crypto AI", "music crypto"]],
  [/token|burn|tokenomics/i, ["tokenomics", "token burn"]],
  [/launch/i, ["crypto launches"]],
  [/distribution/i, ["crypto music distribution"]],
  [/musician|artist/i, ["AI tools for musicians"]],
  [/trust/i, ["trust in AI"]],
  [/feedback loop|creativity/i, ["AI creativity"]],
  [/culture|meme/i, ["AI and culture"]],
  [/interview/i, ["founder interview"]],
  [/build update|weekly build/i, ["build update", "solo founder"]],
  [/welcome|new member/i, ["AI music community", "community welcome"]],
  [/dubai/i, ["Dubai", "crypto AI conversation"]],
];

/** Keyword list for one parsed episode ({ title, metaDescription }). */
export const episodeKeywords = (e) => {
  const text = `${e.title || ""} ${e.metaDescription || ""}`;
  const topics = TOPIC_RULES.flatMap(([re, terms]) => (re.test(text) ? terms : []));
  return withBrand([...topics, ...EPISODE_BASE]);
};

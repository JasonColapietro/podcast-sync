/**
 * Central keyword map for every indexable page on podcast.suedeai.ai.
 *
 * Each page emits `<meta name="keywords">` built from this file: a page-specific
 * list plus the brand terms, deduped case-insensitively. Static pages (home,
 * about, contact) carry the tag in their hand-written HTML; episode pages and
 * /appearances get it from build-episodes.mjs. test/keywords.test.mjs fails if
 * any indexable page ships without the tag or drifts from this map.
 *
 * Terms come from the 2026-09-08 keyword research (brand + misc + music_rights
 * + agents groups) and from what each page actually discusses. No claims.
 */

export const BRAND_TERMS = ["Suede AI", "AI Suede Podcast", "Jason Colapietro", "Johnny Suede"];

/** Case-insensitive dedupe, first spelling wins, brand terms appended. */
export const withBrand = (terms) => {
  const seen = new Set();
  const out = [];
  for (const raw of [...terms, ...BRAND_TERMS]) {
    const term = String(raw).replace(/\s+/g, " ").trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    out.push(term);
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
    "creator ownership",
    "programmable media",
    "AI and music industry",
    "crypto AI podcast",
    "solo founder podcast",
  ],
  "/about": [
    "about the AI Suede Podcast",
    "AI podcast for musicians",
    "podcast host",
    "creator ownership",
    "music IP",
    "programmable media",
    "solo founder",
  ],
  "/contact": [
    "contact AI Suede Podcast",
    "podcast booking",
    "podcast guest request",
    "press inquiries",
    "podcast feedback",
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

/** Base terms every episode page shares before topic terms are added. */
const EPISODE_BASE = ["AI Suede Podcast episode", "AI music podcast"];

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
  [/rights|copyright/i, ["music rights", "who owns AI generated music"]],
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
  [/distribution/i, ["music distribution"]],
  [/musician|artist/i, ["AI tools for musicians"]],
  [/trust/i, ["trust in AI"]],
  [/feedback loop|creativity/i, ["AI creativity"]],
  [/culture|meme/i, ["AI and culture"]],
  [/interview/i, ["founder interview"]],
  [/build update|weekly build/i, ["build update", "solo founder"]],
  [/welcome|new member/i, ["Suede AI community", "community welcome"]],
  [/dubai/i, ["Dubai", "crypto AI conversation"]],
];

/** Keyword list for one parsed episode ({ title, metaDescription }). */
export const episodeKeywords = (e) => {
  const text = `${e.title || ""} ${e.metaDescription || ""}`;
  const topics = TOPIC_RULES.flatMap(([re, terms]) => (re.test(text) ? terms : []));
  return withBrand([...EPISODE_BASE, ...topics]);
};

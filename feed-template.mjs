/**
 * The RSS/iTunes feed template for public/feed.xml — the single source of truth
 * for the feed's shape.
 *
 * Extracted from sync.js so that re-rendering the feed does not require the
 * things sync.js needs to *produce* it: the AWS SDK, dotenv, R2 credentials,
 * yt-dlp, or the git-ignored audio/ cache. sync.js imports buildRSS() after it
 * has gathered episodes from YouTube; regen-feed.mjs imports the same function
 * to re-render the committed feed in place. One template, two callers, so the
 * generator and its output cannot drift.
 *
 * This module has no dependencies and no side effects on purpose — keep it that
 * way, or `node regen-feed.mjs --check` stops working on a clean checkout.
 */

export const SHOW = {
  title: 'AI Suede — Build, Create, Ship',
  subtitle: 'Music IP, AI tools, and solo founder stories',
  description: 'AI tools for creators, music production, and solo founder stories from Jason Colapietro (also known as Johnny Suede) of Suede Labs AI. Covers building with AI, programmable IP, and what it actually takes to ship as a solo founder.',
  keywords: 'AI, music production, creator economy, programmable IP, blockchain music, Suede Labs, Jason Colapietro, Johnny Suede, solo founder, Web3, Base, on-chain royalties, music NFT, artist ownership, crypto, entrepreneurship',
  author: 'Jason Colapietro',
  // Ownership/administrative contact published in <itunes:owner>. This is a
  // machine-readable file that gets scraped wholesale, so it carries the
  // estate's general address rather than an individual's mailbox: Apple sends
  // show-verification mail here, and that should reach whoever administers the
  // show rather than depending on one person's inbox. The human "reach the
  // host" address stays on /contact.
  email: 'info@suedeai.ai',
  link: 'https://podcast.suedeai.ai',
  feedUrl: 'https://podcast.suedeai.ai/feed.xml',
  image: 'https://podcast.suedeai.ai/artwork.jpg',
  language: 'en-us',
  category: 'Technology',
  subcategory: 'Entrepreneurship',
  copyright: `&#xA9; ${new Date().getFullYear()} Jason Colapietro / Suede Labs AI`,
  // Podcasting 2.0 stable GUID for this show (generated once, never changes)
  guid: 'b3e7f1a2-4c8d-4e9f-a0b1-2c3d4e5f6a7b',
  // Canonical Person record for the host, so the feed names the person behind
  // the "Johnny Suede" alias rather than only the alias.
  personUrl: 'https://suedeai.ai/founder',
}

export function formatDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function cleanText(text) {
  return String(text).replace(/\uFFFC/g, '').trim()
}

export function fixDescription(text) {
  if (!text) return text
  return cleanText(text)
    .replace(/🔗 Suede Labs → \[add link\]/g, '🔗 Suede Labs → https://suedeai.ai')
    .replace(/🐦 Johnny Suede → \[add link\]/g, '🐦 Johnny Suede → https://x.com/johnnysuede')
    .replace(/🐦 @aisuede → \[add link\]/g, '🐦 @aisuede → https://x.com/aisuede')
    .replace(/\[([^\]]+)\]\(\1\)/g, '$1')
    .replace(/https:\/\/twitter\.com\//g, 'https://x.com/')
    .replace(/x\.com\/jasoncola1\b/g, 'x.com/johnnysuede')
}

export function buildRSS(episodes) {
  const items = episodes.map((ep, i) => {
    const title = cleanText(ep.title)
    const description = fixDescription(ep.description || ep.title)
    return `
    <item>
      <title><![CDATA[${title}]]></title>
      <itunes:title><![CDATA[${title}]]></itunes:title>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${description}]]></content:encoded>
      <enclosure url="${ep.audioUrl}" length="${ep.fileSize}" type="audio/mpeg"/>
      <guid isPermaLink="false">aisuede-${ep.id}</guid>
      <pubDate>${new Date(ep.timestamp * 1000).toUTCString()}</pubDate>
      <itunes:duration>${formatDuration(ep.duration)}</itunes:duration>
      <itunes:author>${SHOW.author}</itunes:author>
      <dc:creator>${SHOW.author}</dc:creator>
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:episode>${episodes.length - i}</itunes:episode>
      ${ep.thumbnail ? `<itunes:image href="${ep.thumbnail}"/>` : ''}
    </item>`
  }).join('')

  // dc: is declared here because <dc:creator> is used below. A prefixed tag
  // whose namespace is not declared on the root makes the document malformed,
  // not merely unusual — every parser rejects it.
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${SHOW.title}</title>
    <atom:link href="${SHOW.feedUrl}" rel="self" type="application/rss+xml"/>
    <description>${SHOW.description}</description>
    <link>${SHOW.link}</link>
    <language>${SHOW.language}</language>
    <copyright>${SHOW.copyright}</copyright>
    <managingEditor>${SHOW.email} (${SHOW.author})</managingEditor>
    <webMaster>${SHOW.email} (${SHOW.author})</webMaster>
    <dc:creator>${SHOW.author}</dc:creator>
    <itunes:author>${SHOW.author}</itunes:author>
    <itunes:subtitle>${SHOW.subtitle}</itunes:subtitle>
    <itunes:summary>${SHOW.description}</itunes:summary>
    <itunes:keywords>${SHOW.keywords}</itunes:keywords>
    <itunes:type>episodic</itunes:type>
    <itunes:owner>
      <itunes:name>${SHOW.author}</itunes:name>
      <itunes:email>${SHOW.email}</itunes:email>
    </itunes:owner>
    <itunes:image href="${SHOW.image}"/>
    <itunes:category text="${SHOW.category}">
      <itunes:category text="${SHOW.subcategory}"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <podcast:guid>${SHOW.guid}</podcast:guid>
    <podcast:locked>no</podcast:locked>
    <podcast:person role="host" href="${SHOW.personUrl}">${SHOW.author}</podcast:person>
    ${items}
  </channel>
</rss>`
}

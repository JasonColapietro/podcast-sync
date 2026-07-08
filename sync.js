import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, createReadStream } from 'fs'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const CHANNEL = 'https://www.youtube.com/@aisuede/videos'
const AUDIO_DIR = join(__dirname, 'audio')
const STATE_FILE = join(__dirname, 'synced.json')
const RSS_OUT = join(__dirname, 'public', 'feed.xml')

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET = 'aisuede-podcast', R2_PUBLIC_URL } = process.env

const SHOW = {
  title: 'AI Suede — Build, Create, Ship',
  subtitle: 'Music IP, AI tools, and solo founder stories',
  description: 'AI tools for creators, music production, and solo founder stories from Jason Colapietro (also known as Johnny Suede) of Suede Labs AI. Covers building with AI, programmable IP, and what it actually takes to ship as a solo founder.',
  keywords: 'AI, music production, creator economy, programmable IP, blockchain music, Suede Labs, Jason Colapietro, Johnny Suede, solo founder, Web3, Base, on-chain royalties, music NFT, artist ownership, crypto, entrepreneurship',
  author: 'Jason Colapietro',
  email: 'jason@suedeai.ai',
  link: 'https://podcast.suedeai.ai',
  feedUrl: 'https://podcast.suedeai.ai/feed.xml',
  image: 'https://podcast.suedeai.ai/artwork.jpg',
  language: 'en-us',
  category: 'Technology',
  subcategory: 'Entrepreneurship',
  copyright: `&#xA9; ${new Date().getFullYear()} Jason Colapietro / Suede Labs AI`,
  // Podcasting 2.0 stable GUID for this show (generated once, never changes)
  guid: 'b3e7f1a2-4c8d-4e9f-a0b1-2c3d4e5f6a7b',
}

function makeS3() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  })
}

function loadState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {}
}

function getVideos() {
  console.log('Fetching channel videos...')
  const out = execSync(
    `yt-dlp --dump-json --flat-playlist --no-warnings "${CHANNEL}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString()
  return out.trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
}

function downloadAudio(id) {
  const mp3 = join(AUDIO_DIR, `${id}.mp3`)
  if (existsSync(mp3)) {
    console.log(`  already downloaded`)
    return mp3
  }
  mkdirSync(AUDIO_DIR, { recursive: true })
  execSync(
    `yt-dlp -x --audio-format mp3 --audio-quality 0 --write-info-json --no-playlist \
     -o "${join(AUDIO_DIR, '%(id)s.%(ext)s')}" \
     "https://www.youtube.com/watch?v=${id}"`,
    { stdio: 'inherit' }
  )
  return mp3
}

async function ensureUploaded(client, localPath, key) {
  const url = `${R2_PUBLIC_URL}/${key}`
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    console.log(`  already in R2`)
    return url
  } catch {}
  console.log(`  uploading → ${key}`)
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: createReadStream(localPath),
    ContentType: key.endsWith('.mp3') ? 'audio/mpeg' : 'text/xml',
  }))
  return url
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

function cleanText(text) {
  return String(text).replace(/\uFFFC/g, '').trim()
}

function fixDescription(text) {
  if (!text) return text
  return cleanText(text)
    .replace(/🔗 Suede Labs → \[add link\]/g, '🔗 Suede Labs → https://suedeai.ai')
    .replace(/🐦 Johnny Suede → \[add link\]/g, '🐦 Johnny Suede → https://x.com/johnnysuede')
    .replace(/🐦 @aisuede → \[add link\]/g, '🐦 @aisuede → https://x.com/aisuede')
    .replace(/\[([^\]]+)\]\(\1\)/g, '$1')
    .replace(/https:\/\/twitter\.com\//g, 'https://x.com/')
    .replace(/x\.com\/jasoncola1\b/g, 'x.com/johnnysuede')
}

function buildRSS(episodes) {
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
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:episode>${episodes.length - i}</itunes:episode>
      ${ep.thumbnail ? `<itunes:image href="${ep.thumbnail}"/>` : ''}
    </item>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${SHOW.title}</title>
    <atom:link href="${SHOW.feedUrl}" rel="self" type="application/rss+xml"/>
    <description>${SHOW.description}</description>
    <link>${SHOW.link}</link>
    <language>${SHOW.language}</language>
    <copyright>${SHOW.copyright}</copyright>
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
    <podcast:person role="host" href="https://suedeai.ai/founder">${SHOW.author}</podcast:person>
    ${items}
  </channel>
</rss>`
}

async function main() {
  const useR2 = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL
  if (!useR2) console.log('No R2 config — generating RSS locally only (audio URLs will be placeholders)')

  const client = useR2 ? makeS3() : null
  const state = loadState()
  const videos = getVideos()
  console.log(`Found ${videos.length} videos\n`)

  mkdirSync(join(__dirname, 'public'), { recursive: true })

  const episodes = []

  for (const v of videos) {
    console.log(`[${v.id}] ${v.title}`)
    const mp3 = downloadAudio(v.id)

    const infoPath = join(AUDIO_DIR, `${v.id}.info.json`)
    const info = existsSync(infoPath) ? JSON.parse(readFileSync(infoPath, 'utf8')) : {}

    let audioUrl = state[v.id]?.audioUrl
    if (!audioUrl) {
      if (useR2) {
        audioUrl = await ensureUploaded(client, mp3, `episodes/${v.id}.mp3`)
        state[v.id] = { audioUrl }
        writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
      } else {
        audioUrl = `PENDING_R2_SETUP`
      }
    }

    episodes.push({
      id: v.id,
      title: info.title || v.title,
      description: info.description,
      audioUrl,
      fileSize: statSync(mp3).size,
      duration: info.duration || 0,
      timestamp: info.timestamp || v.timestamp || 0,
      thumbnail: info.thumbnail,
    })
  }

  episodes.sort((a, b) => b.timestamp - a.timestamp)

  const rss = buildRSS(episodes)
  writeFileSync(RSS_OUT, rss)
  console.log(`\nRSS written → public/feed.xml`)

  if (useR2) {
    const feedUrl = await ensureUploaded(client, RSS_OUT, 'feed.xml')
    console.log(`Feed on R2  → ${feedUrl}`)
  }

  console.log('\nDone. Commit public/feed.xml + synced.json, then push to deploy.')
}

main().catch(err => { console.error(err); process.exit(1) })

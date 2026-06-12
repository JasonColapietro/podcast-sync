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
  description: 'AI tools for creators, music production, and solo founder stories from Jason Colapietro of Suede Labs AI. Covers building with AI, programmable IP, and what it actually takes to ship as a solo founder.',
  author: 'Jason Colapietro',
  email: 'jasoncola1@gmail.com',
  link: 'https://podcast.suedeai.ai',
  image: 'https://podcast.suedeai.ai/artwork.jpg',
  language: 'en-us',
  category: 'Technology',
  subcategory: 'Entrepreneurship',
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

function buildRSS(episodes) {
  const items = episodes.map(ep => `
    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.description || ep.title}]]></description>
      <enclosure url="${ep.audioUrl}" length="${ep.fileSize}" type="audio/mpeg"/>
      <guid isPermaLink="false">aisuede-${ep.id}</guid>
      <pubDate>${new Date(ep.timestamp * 1000).toUTCString()}</pubDate>
      <itunes:duration>${formatDuration(ep.duration)}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      ${ep.thumbnail ? `<itunes:image href="${ep.thumbnail}"/>` : ''}
    </item>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SHOW.title}</title>
    <description>${SHOW.description}</description>
    <link>${SHOW.link}</link>
    <language>${SHOW.language}</language>
    <itunes:author>${SHOW.author}</itunes:author>
    <itunes:owner>
      <itunes:name>${SHOW.author}</itunes:name>
      <itunes:email>${SHOW.email}</itunes:email>
    </itunes:owner>
    <itunes:image href="${SHOW.image}"/>
    <itunes:category text="${SHOW.category}">
      <itunes:category text="${SHOW.subcategory}"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
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

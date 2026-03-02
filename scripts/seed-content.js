#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { v5: uuidv5 } = require('uuid')

const UUID_NAMESPACE = 'a6f6b7a0-2d16-4f34-9f55-3d8a3d6a6a6c'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function walkMdFiles(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...walkMdFiles(full))
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

function firstMarkdownHeading(text) {
  for (const line of text.split('\n')) {
    const m = line.match(/^#\s+(.+?)\s*$/)
    if (m) return m[1].trim()
  }
  return null
}

function extractPlatform(text) {
  const m = text.match(/\*\*Platform:\*\*\s*([^\n]+)/i) || text.match(/Platform:\s*([^\n]+)/i)
  if (!m) return 'instagram'
  const raw = String(m[1]).toLowerCase()
  if (raw.includes('telegram')) return 'telegram'
  if (raw.includes('tiktok')) return 'tiktok'
  if (raw.includes('reel')) return 'reels'
  if (raw.includes('story')) return 'stories'
  return 'instagram'
}

function inferStatus(filePath, text) {
  const m = text.match(/\*\*Status:\*\*\s*([^\n]+)/i)
  if (m) {
    const raw = String(m[1]).toLowerCase()
    if (raw.includes('published') || raw.includes('posted') || raw.includes('geplaatst')) return 'published'
    if (raw.includes('scheduled') || raw.includes('gepland')) return 'scheduled'
    if (raw.includes('draft') || raw.includes('concept')) return 'draft'
    if (raw.includes('idea') || raw.includes('idee')) return 'idea'
  }

  const name = path.basename(filePath).toLowerCase()
  if (name.includes('brief')) return 'idea'
  if (name.includes('announcement') || name.includes('countdown') || name.includes('instagram')) return 'draft'
  if (text.toLowerCase().includes('caption')) return 'draft'
  return 'idea'
}

function inferPostType(text) {
  const lower = text.toLowerCase()
  if (lower.includes('reel')) return 'reel'
  if (lower.includes('carousel')) return 'carousel'
  if (lower.includes('story')) return 'story'
  if (lower.includes('live')) return 'live'
  return 'post'
}

function extractCaption(text) {
  const idx = text.toLowerCase().indexOf('caption')
  if (idx === -1) return null

  const after = text.slice(idx)
  const fence = after.match(/```[\s\S]*?```/)
  if (!fence) return null

  const block = fence[0]
  const inner = block.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '')
  const caption = inner.trim()
  return caption || null
}

function extractDateFromFilename(filePath) {
  const base = path.basename(filePath)
  const m = base.match(/(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

function stripMarkdownForDescription(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toLegacyStatus(contentPostsStatus) {
  if (contentPostsStatus === 'published') return 'posted'
  if (contentPostsStatus === 'scheduled') return 'scheduled'
  if (contentPostsStatus === 'draft') return 'draft'
  return 'idea'
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')

  loadEnvFile(path.join(process.cwd(), '.env.local'))
  loadEnvFile(path.join(process.cwd(), '.env'))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabaseAdmin = createClient(url, serviceKey)

  const contentDir = process.env.CONTENT_DIR || '/home/node/.openclaw/workspace/content'
  const files = walkMdFiles(contentDir)

  console.log(`Found ${files.length} markdown files in ${contentDir}`)

  const rowsLegacy = []
  const rowsPosts = []

  for (const filePath of files) {
    const rel = path.relative(contentDir, filePath)
    const raw = fs.readFileSync(filePath, 'utf8')

    const scheduledDate = extractDateFromFilename(filePath)
    const title = firstMarkdownHeading(raw) || rel.replace(/\.md$/i, '')
    const platform = extractPlatform(raw)
    const status = inferStatus(filePath, raw)
    const caption = extractCaption(raw)
    const postType = inferPostType(raw)
    const description = stripMarkdownForDescription(raw).slice(0, 280) || null

    const id = uuidv5(rel, UUID_NAMESPACE)

    rowsLegacy.push({
      id,
      title,
      description,
      platform,
      status: toLegacyStatus(status),
      scheduled_date: scheduledDate,
      content_type: postType,
      caption,
      updated_at: new Date().toISOString(),
    })

    rowsPosts.push({
      id,
      title,
      caption,
      platform: platform === 'telegram' ? 'instagram' : platform,
      post_type: postType,
      media_url: null,
      scheduled_date: scheduledDate,
      status,
      assigned_to: 'kate',
      tags: null,
      updated_at: new Date().toISOString(),
    })
  }

  console.log(`Prepared ${rowsLegacy.length} rows for content + ${rowsPosts.length} rows for content_posts`)

  if (dryRun) {
    console.log('Dry run enabled, exiting without writing')
    return
  }

  const chunkSize = 100

  for (let i = 0; i < rowsLegacy.length; i += chunkSize) {
    const chunk = rowsLegacy.slice(i, i + chunkSize)
    const { error } = await supabaseAdmin.from('content').upsert(chunk, { onConflict: 'id' })
    if (error) {
      console.error('Failed upserting into content:', error.code || '', error.message)
      process.exit(2)
    }
    console.log(`Upserted content: ${Math.min(i + chunkSize, rowsLegacy.length)}/${rowsLegacy.length}`)
  }

  const { error: postsError } = await supabaseAdmin.from('content_posts').upsert(rowsPosts, { onConflict: 'id' })
  if (postsError) {
    console.warn('content_posts upsert skipped/failed:', postsError.code || '', postsError.message)
    console.warn('The dashboard will still work via content-posts API fallback to the legacy content table.')
  } else {
    console.log('Upserted content_posts successfully')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


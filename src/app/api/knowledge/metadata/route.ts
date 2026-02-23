export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function detectType(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video'
  if (url.includes('instagram.com')) return 'social'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'social'
  if (url.endsWith('.pdf')) return 'document'
  return 'article'
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const type = detectType(url)

    // YouTube special handling
    const ytId = extractYouTubeId(url)
    if (ytId) {
      return NextResponse.json({
        title: `YouTube Video`,
        description: '',
        image: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        type: 'video',
        youtube_id: ytId,
      })
    }

    // Fetch page metadata
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MakeItHappenBot/1.0)',
        },
        signal: AbortSignal.timeout(8000),
      })
      const html = await res.text()

      // Extract OG tags
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1]
        || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
        || ''

      const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)?.[1]
        || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || ''

      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1]
        || ''

      return NextResponse.json({
        title: ogTitle.trim().substring(0, 200),
        description: ogDesc.trim().substring(0, 500),
        image: ogImage,
        type,
      })
    } catch {
      // If fetch fails, return basic info
      const hostname = new URL(url).hostname
      return NextResponse.json({
        title: hostname,
        description: '',
        image: '',
        type,
      })
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

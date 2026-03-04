export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// When deployed on Vercel, all file ops are proxied to the local agency server
// running on TrueNAS. Set WORKSPACE_API_URL and WORKSPACE_API_KEY in Vercel env.
const WORKSPACE_API_URL = process.env.WORKSPACE_API_URL // e.g. https://your-tunnel.trycloudflare.com
const WORKSPACE_API_KEY = process.env.WORKSPACE_API_KEY

function buildProxyUrl(searchParams: URLSearchParams): string {
  return `${WORKSPACE_API_URL}/api/workspace/files?${searchParams.toString()}`
}

function proxyHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(WORKSPACE_API_KEY ? { Authorization: `Bearer ${WORKSPACE_API_KEY}` } : {}),
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  if (!WORKSPACE_API_URL) {
    return NextResponse.json({ error: 'WORKSPACE_API_URL not configured' }, { status: 503 })
  }

  try {
    const upstreamRes = await fetch(buildProxyUrl(searchParams), {
      method: 'GET',
      headers: proxyHeaders(),
      // Vercel fetch timeout
      signal: AbortSignal.timeout(15_000),
    })

    const data = await upstreamRes.json()
    return NextResponse.json(data, { status: upstreamRes.status })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!WORKSPACE_API_URL) {
    return NextResponse.json({ error: 'WORKSPACE_API_URL not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)

    const upstreamRes = await fetch(buildProxyUrl(searchParams), {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await upstreamRes.json()
    return NextResponse.json(data, { status: upstreamRes.status })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

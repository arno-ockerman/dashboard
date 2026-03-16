export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { formatSupabaseError, isMissingTableError } from '@/lib/supabase-error'

type ContentPostStatus = 'idea' | 'draft' | 'scheduled' | 'published'
type LegacyContentStatus = 'idea' | 'draft' | 'scheduled' | 'posted'

function mapLegacyToContentPostStatus(status: string | null | undefined): ContentPostStatus {
  if (status === 'posted') return 'published'
  if (status === 'scheduled') return 'scheduled'
  if (status === 'draft') return 'draft'
  return 'idea'
}

function mapContentPostToLegacyStatus(status: string | null | undefined): LegacyContentStatus {
  if (status === 'published') return 'posted'
  if (status === 'scheduled') return 'scheduled'
  if (status === 'draft') return 'draft'
  return 'idea'
}

function legacyRowToContentPost(row: any) {
  const platformRaw = typeof row.platform === 'string' ? row.platform : 'instagram'
  const platform = ['instagram', 'facebook', 'tiktok', 'linkedin'].includes(platformRaw) ? platformRaw : 'instagram'
  const postTypeRaw = typeof row.content_type === 'string' ? row.content_type : 'post'
  const postType = ['reel', 'carousel', 'story', 'post', 'live'].includes(postTypeRaw) ? postTypeRaw : 'post'

  return {
    id: row.id,
    title: row.title,
    caption: row.caption ?? null,
    platform,
    post_type: postType,
    media_url: row.media_url ?? null,
    scheduled_date: row.scheduled_date ?? null,
    status: mapLegacyToContentPostStatus(row.status),
    assigned_to: row.assigned_to ?? 'kate',
    tags: row.tags ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')
    const weekEnd = searchParams.get('week_end')
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    let query = supabaseAdmin
      .from('content_posts')
      .select('*')
      .order('scheduled_date', { ascending: true, nullsFirst: false })

    if (weekStart) query = query.gte('scheduled_date', weekStart)
    if (weekEnd) query = query.lte('scheduled_date', weekEnd)
    if (platform && platform !== 'all') query = query.eq('platform', platform)
    if (status && status !== 'all') query = query.eq('status', status)
    if (limit) query = query.limit(parseInt(limit))

    const { data, error } = await query
    if (error) {
      if (isMissingTableError(error)) {
        let legacyQuery = supabaseAdmin
          .from('content')
          .select('*')
          .order('scheduled_date', { ascending: true, nullsFirst: false })

        if (weekStart) legacyQuery = legacyQuery.gte('scheduled_date', weekStart)
        if (weekEnd) legacyQuery = legacyQuery.lte('scheduled_date', weekEnd)
        if (platform && platform !== 'all') legacyQuery = legacyQuery.eq('platform', platform)
        if (status && status !== 'all') legacyQuery = legacyQuery.eq('status', mapContentPostToLegacyStatus(status))
        if (limit) legacyQuery = legacyQuery.limit(parseInt(limit))

        const { data: legacyData, error: legacyError } = await legacyQuery
        if (legacyError) {
          if (isMissingTableError(legacyError)) return NextResponse.json([])
          throw legacyError
        }

        return NextResponse.json((legacyData || []).map(legacyRowToContentPost))
      }
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('content_posts')
      .insert({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        const { data: legacyData, error: legacyError } = await supabaseAdmin
          .from('content')
          .insert({
            title: body.title,
            caption: body.caption ?? null,
            platform: body.platform ?? 'instagram',
            status: mapContentPostToLegacyStatus(body.status),
            scheduled_date: body.scheduled_date ?? null,
            content_type: body.post_type ?? 'post',
            media_url: body.media_url ?? null,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (legacyError) {
          if (isMissingTableError(legacyError)) {
            return NextResponse.json(
              { error: 'Content tables missing. Run dashboard schema setup/migrations.' },
              { status: 503 }
            )
          }
          throw legacyError
        }

        return NextResponse.json(legacyRowToContentPost(legacyData), { status: 201 })
      }
      throw error
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...rest } = body
    const { data, error } = await supabaseAdmin
      .from('content_posts')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        const legacyPayload: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }
        if (typeof rest.status === 'string') legacyPayload.status = mapContentPostToLegacyStatus(rest.status)
        if (typeof rest.post_type === 'string') {
          legacyPayload.content_type = rest.post_type
          delete legacyPayload.post_type
        }

        const { data: legacyData, error: legacyError } = await supabaseAdmin
          .from('content')
          .update(legacyPayload)
          .eq('id', id)
          .select()
          .single()

        if (legacyError) {
          if (isMissingTableError(legacyError)) {
            return NextResponse.json(
              { error: 'Content tables missing. Run dashboard schema setup/migrations.' },
              { status: 503 }
            )
          }
          throw legacyError
        }

        return NextResponse.json(legacyRowToContentPost(legacyData))
      }
      throw error
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabaseAdmin.from('content_posts').delete().eq('id', id)
    if (error) {
      if (isMissingTableError(error)) {
        const { error: legacyError } = await supabaseAdmin.from('content').delete().eq('id', id)
        if (legacyError) {
          if (isMissingTableError(legacyError)) {
            return NextResponse.json(
              { error: 'Content tables missing. Run dashboard schema setup/migrations.' },
              { status: 503 }
            )
          }
          throw legacyError
        }
        return NextResponse.json({ success: true })
      }
      throw error
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('name')

    if (error) throw error

    return NextResponse.json({ projects: data || [] })
  } catch (err) {
    console.error('Projects GET error:', err)
    return NextResponse.json({ projects: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, description, status, github_repo, vercel_url, metadata } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description,
        status: status || 'active',
        github_repo,
        vercel_url,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ project: data })
  } catch (err) {
    console.error('Projects POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

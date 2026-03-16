import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const assignedTo = searchParams.get('assigned_to')
    const priority = searchParams.get('priority')
    const project = searchParams.get('project')

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (priority) query = query.eq('priority', priority)
    if (project) query = query.eq('project', project)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ tasks: data || [] })
  } catch (err) {
    console.error('Tasks GET error:', err)
    return NextResponse.json({ tasks: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, description, assigned_to, priority, status, project, created_by } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        title,
        description,
        assigned_to,
        priority: priority || 'medium',
        status: status || 'todo',
        project,
        created_by: created_by || 'arno',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task: data })
  } catch (err) {
    console.error('Tasks POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

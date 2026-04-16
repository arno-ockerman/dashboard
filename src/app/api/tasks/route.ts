import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { taskSchema } from '@/lib/validators'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!
  try {
    const { searchParams } = new URL(req.url)
    const assignedTo = searchParams.get('assigned_to')
    const priority = searchParams.get('priority')
    const project = searchParams.get('project')
    const status = searchParams.get('status')
    const queryText = searchParams.get('q')?.trim()

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (priority) query = query.eq('priority', priority)
    if (project) query = query.eq('project', project)
    if (status) query = query.eq('status', status)
    if (queryText) {
      const escaped = queryText.replace(/[%_,]/g, (char) => `\\${char}`)
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ tasks: data || [] })
  } catch (err) {
    console.error('Tasks GET error:', err)
    return NextResponse.json({ tasks: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!
  try {
    const body = await req.json()
    const parsed = taskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { title, description, assigned_to, priority, status, project, created_by } = parsed.data

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

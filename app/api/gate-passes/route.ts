import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, HttpError } from '@/lib/auth/require-role'
import { createGatePassSchema } from '@/lib/schemas/gate-pass.schema'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const log = logger.child({ route: '/api/gate-passes' })
  const supabase = createClient()
  const start = Date.now()

  try {
    log.info({ method: 'GET' }, 'handling request')
    const { userId, role } = await requireRole(supabase, ['student', 'warden', 'security'])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabase
      .from('gate_passes')
      .select(`
        *,
        student:profiles!gate_passes_student_id_fkey(full_name, enrollment_no, avatar_url)
      `)
      .order('created_at', { ascending: false })

    // Students see only their own passes (RLS also enforces this)
    if (role === 'student') {
      query = query.eq('student_id', userId)
    }

    if (status) {
      // status can be comma-separated e.g. "pending,approved"
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    const { data, error } = await query

    if (error) throw new HttpError(error.message, 500)

    // Client-side search filter (for security's search-as-you-type)
    let result = data ?? []
    if (search && (role === 'security' || role === 'warden')) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.student?.full_name?.toLowerCase().includes(q) ||
          p.student?.enrollment_no?.toLowerCase().includes(q)
      )
    }

    log.info({ status: 200, ms: Date.now() - start }, 'request complete')
    return NextResponse.json(result)
  } catch (err: any) {
    log.error({ err, status: err.status ?? 500 }, 'handler error')
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function POST(request: Request) {
  const log = logger.child({ route: '/api/gate-passes' })
  const supabase = createClient()
  const start = Date.now()

  try {
    log.info({ method: 'POST' }, 'handling request')
    const { userId } = await requireRole(supabase, ['student'])

    const body = await request.json()
    const parsed = createGatePassSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { declaration: _declaration, ...insertData } = parsed.data

    const { data, error } = await supabase
      .from('gate_passes')
      .insert({
        ...insertData,
        student_id: userId,
        from_location: 'Starex University',
        status: 'pending',
      })
      .select(`
        *,
        student:profiles!gate_passes_student_id_fkey(full_name, enrollment_no, avatar_url)
      `)
      .single()

    if (error) throw new HttpError(error.message, 500)

    log.info({ status: 201, ms: Date.now() - start }, 'gate pass created')
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    log.error({ err, status: err.status ?? 500 }, 'handler error')
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, HttpError } from '@/lib/auth/require-role'
import { logger } from '@/lib/logger'
import { format } from 'date-fns'

export async function GET() {
  const log = logger.child({ route: '/api/dashboard/stats' })
  const supabase = createClient()
  const start = Date.now()

  try {
    log.info({ method: 'GET' }, 'handling request')
    await requireRole(supabase, ['warden'])

    const today = format(new Date(), 'yyyy-MM-dd')

    const [pendingRes, outCampusRes, todayMealsRes] = await Promise.all([
      supabase
        .from('gate_passes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('gate_passes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'checked_out'),
      supabase
        .from('food_menu')
        .select('*')
        .eq('menu_date', today),
    ])

    if (pendingRes.error) throw new HttpError(pendingRes.error.message, 500)
    if (outCampusRes.error) throw new HttpError(outCampusRes.error.message, 500)

    // inCampus = total students - outCampus
    const { count: totalStudents } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')

    const outCampus = outCampusRes.count ?? 0
    const inCampus = Math.max(0, (totalStudents ?? 0) - outCampus)

    log.info({ status: 200, ms: Date.now() - start }, 'stats fetched')
    return NextResponse.json({
      pending: pendingRes.count ?? 0,
      outCampus,
      inCampus,
      todayMeals: todayMealsRes.data ?? [],
    })
  } catch (err: any) {
    log.error({ err, status: err.status ?? 500 }, 'handler error')
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

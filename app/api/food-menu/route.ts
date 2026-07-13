import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, HttpError } from '@/lib/auth/require-role'
import { upsertFoodMenuSchema } from '@/lib/schemas/food-menu.schema'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const log = logger.child({ route: '/api/food-menu' })
  const supabase = createClient()
  const start = Date.now()

  try {
    log.info({ method: 'GET' }, 'handling request')
    await requireRole(supabase, ['student', 'warden', 'security', 'mess_manager'])

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError('date query param required (YYYY-MM-DD)', 400)
    }

    const { data, error } = await supabase
      .from('food_menu')
      .select('*')
      .eq('menu_date', date)
      .order('meal_type')

    if (error) throw new HttpError(error.message, 500)

    log.info({ status: 200, ms: Date.now() - start }, 'request complete')
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    log.error({ err, status: err.status ?? 500 }, 'handler error')
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function PUT(request: Request) {
  const log = logger.child({ route: '/api/food-menu' })
  const supabase = createClient()
  const start = Date.now()

  try {
    log.info({ method: 'PUT' }, 'handling request')
    const { userId } = await requireRole(supabase, ['mess_manager'])

    const body = await request.json()
    const parsed = upsertFoodMenuSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('food_menu')
      .upsert(
        { ...parsed.data, updated_by: userId },
        { onConflict: 'menu_date,meal_type' }
      )
      .select()
      .single()

    if (error) throw new HttpError(error.message, 500)

    log.info({ status: 200, ms: Date.now() - start }, 'food menu upserted')
    return NextResponse.json(data)
  } catch (err: any) {
    log.error({ err, status: err.status ?? 500 }, 'handler error')
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

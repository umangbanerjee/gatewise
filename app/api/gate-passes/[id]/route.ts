import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, HttpError } from '@/lib/auth/require-role'
import { denyGatePassSchema } from '@/lib/schemas/denial.schema'
import { logger } from '@/lib/logger'

type Params = { params: { id: string } }

export async function PATCH(request: Request, { params }: Params) {
  const log = logger.child({ route: '/api/gate-passes/[id]' })
  const supabase = createClient()
  const start = Date.now()

  try {
    log.info({ method: 'PATCH', gatePassId: params.id }, 'handling request')

    const body = await request.json()
    const { action } = body as { action: string }

    if (!['approve', 'deny', 'checkout', 'checkin'].includes(action)) {
      throw new HttpError('Invalid action', 400)
    }

    // Route to role based on action
    if (action === 'approve' || action === 'deny') {
      const { userId } = await requireRole(supabase, ['warden'])

      let updatePayload: Record<string, unknown>

      if (action === 'approve') {
        updatePayload = {
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
        }
      } else {
        // deny
        const parsed = denyGatePassSchema.safeParse({ denied_reason: body.denied_reason })
        if (!parsed.success) {
          return NextResponse.json(
            { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
            { status: 400 }
          )
        }
        updatePayload = {
          status: 'denied',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          denied_reason: parsed.data.denied_reason,
        }
      }

      const { data, error } = await supabase
        .from('gate_passes')
        .update(updatePayload)
        .eq('id', params.id)
        .select(`
          *,
          student:profiles!gate_passes_student_id_fkey(full_name, enrollment_no, avatar_url)
        `)
        .single()

      if (error) throw new HttpError(error.message, 500)

      log.info({ status: 200, action, ms: Date.now() - start }, 'gate pass updated')
      return NextResponse.json(data)
    }

    if (action === 'checkout' || action === 'checkin') {
      const { userId } = await requireRole(supabase, ['security'])

      // Explicit field allowlist — never spread request body
      const updatePayload =
        action === 'checkout'
          ? {
              status: 'checked_out' as const,
              checked_out_by: userId,
              checked_out_at: new Date().toISOString(),
            }
          : {
              status: 'checked_in' as const,
              checked_in_by: userId,
              checked_in_at: new Date().toISOString(),
            }

      const { data, error } = await supabase
        .from('gate_passes')
        .update(updatePayload)
        .eq('id', params.id)
        .select(`
          *,
          student:profiles!gate_passes_student_id_fkey(full_name, enrollment_no, avatar_url)
        `)
        .single()

      if (error) throw new HttpError(error.message, 500)

      log.info({ status: 200, action, ms: Date.now() - start }, 'gate pass updated')
      return NextResponse.json(data)
    }

    throw new HttpError('Unhandled action', 400)
  } catch (err: any) {
    log.error({ err, status: err.status ?? 500 }, 'handler error')
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

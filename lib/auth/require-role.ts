import { type SupabaseClient } from '@supabase/supabase-js'
import type { Role } from '@/types'

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export async function requireRole(
  supabase: SupabaseClient,
  allowedRoles: Role[]
): Promise<{ userId: string; role: Role }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new HttpError('Unauthorized', 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new HttpError('Profile not found', 401)
  }

  if (!allowedRoles.includes(profile.role as Role)) {
    throw new HttpError('Forbidden', 403)
  }

  return { userId: user.id, role: profile.role as Role }
}

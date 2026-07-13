import { z } from 'zod'

export const denyGatePassSchema = z.object({
  denied_reason: z
    .string()
    .min(10, 'Denial reason must be at least 10 characters'),
})

export type DenyGatePassInput = z.infer<typeof denyGatePassSchema>

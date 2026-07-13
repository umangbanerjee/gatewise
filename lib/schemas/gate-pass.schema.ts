import { z } from 'zod'

export const createGatePassSchema = z
  .object({
    to_location: z.string().min(1, 'Destination is required'),
    exit_datetime: z
      .string()
      .min(1, 'Exit date & time is required')
      .refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid exit date/time' })
      .refine((v) => new Date(v) > new Date(), {
        message: 'Exit time must be in the future',
      }),
    return_datetime: z
      .string()
      .min(1, 'Return date & time is required')
      .refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid return date/time' }),
    description: z.string().min(1, 'Description is required'),
    declaration: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the declaration to proceed' }),
    }),
  })
  .refine((d) => new Date(d.return_datetime) > new Date(d.exit_datetime), {
    message: 'Return time must be after exit time',
    path: ['return_datetime'],
  })

export type CreateGatePassInput = z.infer<typeof createGatePassSchema>

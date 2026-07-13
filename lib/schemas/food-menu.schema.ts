import { z } from 'zod'

export const upsertFoodMenuSchema = z
  .object({
    menu_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    meal_type: z.enum(['breakfast', 'lunch', 'snacks', 'dinner'], {
      errorMap: () => ({ message: 'Invalid meal type' }),
    }),
    items: z
      .array(z.string().min(1, 'Item cannot be empty'))
      .min(1, 'At least one item is required'),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: 'End time must be after start time',
    path: ['end_time'],
  })

export type UpsertFoodMenuInput = z.infer<typeof upsertFoodMenuSchema>

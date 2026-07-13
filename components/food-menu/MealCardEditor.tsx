'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Coffee, UtensilsCrossed, Sandwich, Moon } from 'lucide-react'
import { toast } from 'sonner'
import { upsertFoodMenuSchema, type UpsertFoodMenuInput } from '@/lib/schemas/food-menu.schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { FoodMenu, MealType } from '@/types'

const MEAL_ICONS: Record<MealType, React.ComponentType<{ className?: string }>> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  snacks: Sandwich,
  dinner: Moon,
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
}

interface MealCardEditorProps {
  mealType: MealType
  menuDate: string
  existing: FoodMenu | null
  loading?: boolean
  onSaved: (menu: FoodMenu) => void
}

export function MealCardEditor({ mealType, menuDate, existing, loading, onSaved }: MealCardEditorProps) {
  const Icon = MEAL_ICONS[mealType]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpsertFoodMenuInput>({
    resolver: zodResolver(upsertFoodMenuSchema),
    defaultValues: {
      menu_date: menuDate,
      meal_type: mealType,
      items: existing?.items?.length ? existing.items : [''],
      start_time: existing?.start_time ?? '',
      end_time: existing?.end_time ?? '',
    },
  })

  const items = watch('items')

  function addItem() {
    setValue('items', [...items, ''])
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setValue('items', items.filter((_, i) => i !== index))
    }
  }

  // Reset form when existing data changes (date change)
  useEffect(() => {
    reset({
      menu_date: menuDate,
      meal_type: mealType,
      items: existing?.items?.length ? existing.items : [''],
      start_time: existing?.start_time ?? '',
      end_time: existing?.end_time ?? '',
    })
  }, [existing, menuDate, mealType, reset])

  async function onSubmit(data: UpsertFoodMenuInput) {
    try {
      const res = await fetch('/api/food-menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to save menu')
        return
      }
      toast.success(`${MEAL_LABELS[mealType]} menu saved!`)
      onSaved(json)
    } catch {
      toast.error('Network error. Please try again.')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2"><Skeleton className="h-5 w-28" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {MEAL_LABELS[mealType]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Start Time</Label>
              <Input type="time" className="h-8 text-sm" {...register('start_time')} />
              {errors.start_time && <p className="text-xs text-destructive">{errors.start_time.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Time</Label>
              <Input type="time" className="h-8 text-sm" {...register('end_time')} />
              {errors.end_time && <p className="text-xs text-destructive">{errors.end_time.message}</p>}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label className="text-xs">Menu Items</Label>
            {items.map((_, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  className="h-8 text-sm flex-1"
                  placeholder={`Item ${index + 1}`}
                  {...register(`items.${index}` as const)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {errors.items && (
              <p className="text-xs text-destructive">
                {Array.isArray(errors.items) ? 'Some items are empty' : (errors.items as any)?.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={addItem}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Item
            </Button>
          </div>

          <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

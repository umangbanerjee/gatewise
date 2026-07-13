'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MealCard } from '@/components/food-menu/MealCard'
import { cn } from '@/lib/utils'
import type { FoodMenu, MealType } from '@/types'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner']

export default function FoodMenuPage() {
  const [date, setDate] = useState<Date>(new Date())
  const [menus, setMenus] = useState<Record<MealType, FoodMenu | null>>({
    breakfast: null, lunch: null, snacks: null, dinner: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMenus() {
      setLoading(true)
      try {
        const dateStr = format(date, 'yyyy-MM-dd')
        const res = await fetch(`/api/food-menu?date=${dateStr}`)
        if (!res.ok) return
        const data: FoodMenu[] = await res.json()
        const map: Record<MealType, FoodMenu | null> = {
          breakfast: null, lunch: null, snacks: null, dinner: null,
        }
        data.forEach(m => { map[m.meal_type] = m })
        setMenus(map)
      } finally {
        setLoading(false)
      }
    }
    fetchMenus()
  }, [date])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Food Menu</h1>

        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('gap-2', !date && 'text-muted-foreground')}>
              <CalendarIcon className="h-4 w-4" />
              {date ? format(date, 'MMMM do, yyyy') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MEAL_TYPES.map(mealType => (
          <MealCard
            key={mealType}
            mealType={mealType}
            menu={menus[mealType]}
            loading={loading}
          />
        ))}
      </div>
    </div>
  )
}

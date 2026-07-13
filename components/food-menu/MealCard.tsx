import { Coffee, UtensilsCrossed, Sandwich, Moon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FoodMenu, MealType } from '@/types'

const MEAL_CONFIG: Record<MealType, { label: string; icon: React.ComponentType<{ className?: string }>; timeRange: string }> = {
  breakfast: { label: 'Breakfast', icon: Coffee, timeRange: '8:00 am – 10:30 am' },
  lunch:     { label: 'Lunch',     icon: UtensilsCrossed, timeRange: '12:30 pm – 2:30 pm' },
  snacks:    { label: 'Snacks',    icon: Sandwich, timeRange: '5:00 pm – 6:00 pm' },
  dinner:    { label: 'Dinner',    icon: Moon, timeRange: '8:00 pm – 9:00 pm' },
}

function isCurrentMeal(menu: FoodMenu): boolean {
  const now = new Date()
  const [sh, sm] = menu.start_time.split(':').map(Number)
  const [eh, em] = menu.end_time.split(':').map(Number)
  const start = new Date(); start.setHours(sh, sm, 0, 0)
  const end = new Date(); end.setHours(eh, em, 0, 0)
  return now >= start && now <= end
}

interface MealCardProps {
  mealType: MealType
  menu: FoodMenu | null
  loading?: boolean
}

export function MealCard({ mealType, menu, loading }: MealCardProps) {
  const config = MEAL_CONFIG[mealType]
  const Icon = config.icon
  const active = menu ? isCurrentMeal(menu) : false

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-3 w-32" />
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-3 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'transition-all',
      active && 'border-primary shadow-md ring-1 ring-primary/20'
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
          {config.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {menu ? (
          <>
            <p className="text-xs text-muted-foreground">
              Time: {menu.start_time} – {menu.end_time}
            </p>
            <ul className="space-y-0.5">
              {menu.items.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">No menu set for this meal.</p>
        )}
      </CardContent>
    </Card>
  )
}

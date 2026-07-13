import { Users, UserCheck, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardStats, MealType } from '@/types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
}

interface WardenStatsProps {
  stats: DashboardStats | null
  loading: boolean
}

export function WardenStats({ stats, loading }: WardenStatsProps) {
  const statCards = [
    {
      label: 'Pending Approvals',
      value: stats?.pending ?? 0,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Out of Campus',
      value: stats?.outCampus ?? 0,
      icon: Users,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'In Campus',
      value: stats?.inCampus ?? 0,
      icon: UserCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-xl p-3 ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-7 w-10 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{s.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Today's meal times */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Today&apos;s Meal Schedule</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : stats?.todayMeals && stats.todayMeals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.todayMeals.map(m => (
                <div key={m.meal_type} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs font-semibold capitalize text-primary">{MEAL_LABELS[m.meal_type as MealType]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.start_time} – {m.end_time}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No meal schedule set for today.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

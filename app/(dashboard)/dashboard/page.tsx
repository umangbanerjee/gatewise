import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WardenStatsClient } from './WardenStatsClient'
import { DoorOpen, ShieldCheck, UtensilsCrossed, ClipboardEdit } from 'lucide-react'
import type { FoodMenu, MealType } from '@/types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner',
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayMeals } = await supabase
    .from('food_menu')
    .select('*')
    .eq('menu_date', today)

  const meals = (todayMeals ?? []) as FoodMenu[]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {profile.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM do yyyy')}
        </p>
      </div>

      {/* Warden: stats + quick link */}
      {profile.role === 'warden' && (
        <div className="space-y-4">
          <WardenStatsClient />
          <Button asChild>
            <Link href="/gate-pass/approvals">Review Pending Approvals</Link>
          </Button>
        </div>
      )}

      {/* Student: quick action */}
      {profile.role === 'student' && (
        <Card>
          <CardContent className="flex items-center justify-between p-5 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <DoorOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Exit Pass</p>
                <p className="text-sm text-muted-foreground">Request permission to leave campus</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/gate-pass">View My Passes</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Security: quick action */}
      {profile.role === 'security' && (
        <Card>
          <CardContent className="flex items-center justify-between p-5 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Student Checkout</p>
                <p className="text-sm text-muted-foreground">Check students in and out of campus</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/checkout">Open Checkout</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mess Manager: quick action */}
      {profile.role === 'mess_manager' && (
        <Card>
          <CardContent className="flex items-center justify-between p-5 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <ClipboardEdit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Manage Food Menu</p>
                <p className="text-sm text-muted-foreground">Set today&apos;s meal items and timing</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/food-menu/manage">Edit Menu</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today's meals — shown to all roles */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Today&apos;s Meal Schedule</p>
          </div>
          {meals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {meals.map(m => (
                <div key={m.meal_type} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs font-semibold text-primary">{MEAL_LABELS[m.meal_type as MealType]}</p>
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

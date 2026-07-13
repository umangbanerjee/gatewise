'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { GatePass } from '@/types'

interface CheckoutCardProps {
  gatePass: GatePass
  action: 'checkout' | 'checkin'
  onActionComplete: (id: string) => void
}

export function CheckoutCard({ gatePass, action, onActionComplete }: CheckoutCardProps) {
  const [loading, setLoading] = useState(false)
  const student = gatePass.student
  const initials = student?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  async function handleAction() {
    setLoading(true)
    try {
      const res = await fetch(`/api/gate-passes/${gatePass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action === 'checkout' ? 'checkout' : 'checkin' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(action === 'checkout' ? 'Student checked out' : 'Student checked in')
      onActionComplete(gatePass.id)
    } catch (e: any) {
      toast.error(e.message ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-muted-foreground">{student?.enrollment_no ?? '—'}</p>
            <p className="text-sm font-semibold">{student?.full_name ?? 'Student'}</p>
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="font-medium text-gray-700">Starex</span>
          <span className="flex-1 border-t border-dashed border-gray-300" />
          <span className="text-xs">›</span>
          <span className="flex-1 border-t border-dashed border-gray-300" />
          <span className="font-medium text-gray-700">{gatePass.to_location}</span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground">Exit</p>
            <p className="font-semibold">{format(new Date(gatePass.exit_datetime), 'dd-MM-yyyy')}</p>
            <p className="text-muted-foreground">{format(new Date(gatePass.exit_datetime), 'h:mm a')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Return</p>
            <p className="font-semibold">{format(new Date(gatePass.return_datetime), 'dd-MM-yyyy')}</p>
            <p className="text-muted-foreground">{format(new Date(gatePass.return_datetime), 'h:mm a')}</p>
          </div>
        </div>

        {/* Status + Action */}
        <div className="flex items-center justify-between pt-1">
          <Badge variant="success" className="text-xs">
            {action === 'checkout' ? '● Approved' : '● Checked Out'}
          </Badge>
          <Button size="sm" onClick={handleAction} disabled={loading}>
            {loading ? 'Processing…' : action === 'checkout' ? 'Check Out' : 'Check In'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DenyDialog } from './DenyDialog'
import type { GatePass } from '@/types'

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  denied: { label: 'Rejected', variant: 'destructive' },
  checked_out: { label: 'Marked Out', variant: 'info' },
  checked_in: { label: 'Marked In', variant: 'secondary' },
}

interface GatePassCardProps {
  gatePass: GatePass
  showActions?: boolean
  onActionComplete?: (id: string) => void
}

export function GatePassCard({ gatePass, showActions = false, onActionComplete }: GatePassCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [denyOpen, setDenyOpen] = useState(false)
  const [loading, setLoading] = useState<'approve' | 'deny' | null>(null)

  const student = gatePass.student
  const initials = student?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'
  const statusInfo = STATUS_BADGE[gatePass.status] ?? { label: gatePass.status, variant: 'outline' as const }

  async function handleApprove() {
    setLoading('approve')
    try {
      const res = await fetch(`/api/gate-passes/${gatePass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Gate pass approved')
      onActionComplete?.(gatePass.id)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to approve')
    } finally {
      setLoading(null)
    }
  }

  async function handleDeny(reason: string) {
    setLoading('deny')
    try {
      const res = await fetch(`/api/gate-passes/${gatePass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny', denied_reason: reason }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Gate pass denied')
      setDenyOpen(false)
      onActionComplete?.(gatePass.id)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to deny')
      throw e // re-throw so DenyDialog stays open
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">{student?.enrollment_no ?? '—'}</p>
                <p className="text-sm font-semibold">{student?.full_name ?? 'Student'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailOpen(true)}>
                <Info className="h-3.5 w-3.5" />
              </Button>
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

          {/* Actions */}
          {showActions && gatePass.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setDenyOpen(true)}
                disabled={loading !== null}
              >
                Deny
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleApprove}
                disabled={loading !== null}
              >
                {loading === 'approve' ? 'Approving…' : 'Approve'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gate Pass Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-xs">Student</p><p className="font-medium">{student?.full_name}</p></div>
              <div><p className="text-muted-foreground text-xs">Enrollment No.</p><p className="font-medium">{student?.enrollment_no ?? '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">From</p><p className="font-medium">{gatePass.from_location}</p></div>
              <div><p className="text-muted-foreground text-xs">To</p><p className="font-medium">{gatePass.to_location}</p></div>
              <div><p className="text-muted-foreground text-xs">Exit</p><p className="font-medium">{format(new Date(gatePass.exit_datetime), 'dd MMM yyyy, h:mm a')}</p></div>
              <div><p className="text-muted-foreground text-xs">Return</p><p className="font-medium">{format(new Date(gatePass.return_datetime), 'dd MMM yyyy, h:mm a')}</p></div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Description</p>
              <p className="rounded-md bg-muted p-2">{gatePass.description}</p>
            </div>
            {gatePass.denied_reason && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Denial Reason</p>
                <p className="rounded-md bg-destructive/10 text-destructive p-2">{gatePass.denied_reason}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-xs">Status:</p>
              <Badge variant={STATUS_BADGE[gatePass.status]?.variant as any}>{STATUS_BADGE[gatePass.status]?.label}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny dialog */}
      <DenyDialog
        open={denyOpen}
        onOpenChange={setDenyOpen}
        onConfirm={handleDeny}
        loading={loading === 'deny'}
      />
    </>
  )
}

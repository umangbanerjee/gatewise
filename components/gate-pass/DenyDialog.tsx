'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { denyGatePassSchema, type DenyGatePassInput } from '@/lib/schemas/denial.schema'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface DenyDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  loading: boolean
}

export function DenyDialog({ open, onOpenChange, onConfirm, loading }: DenyDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DenyGatePassInput>({ resolver: zodResolver(denyGatePassSchema) })

  async function onSubmit(data: DenyGatePassInput) {
    await onConfirm(data.denied_reason)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deny Gate Pass</DialogTitle>
          <DialogDescription>
            Provide a reason for denying this request. The student will see this message.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="denied_reason">Reason (min. 10 characters)</Label>
            <Textarea
              id="denied_reason"
              placeholder="e.g. Insufficient notice period given for this request…"
              rows={4}
              {...register('denied_reason')}
            />
            {errors.denied_reason && (
              <p className="text-xs text-destructive">{errors.denied_reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? 'Denying…' : 'Confirm Denial'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

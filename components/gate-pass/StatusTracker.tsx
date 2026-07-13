import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GatePassStatus } from '@/types'

const STEPS = [
  'Gate Pass Generated',
  "Warden's Approval",
  'Check Out',
  'Check In',
]

function getStepState(stepIndex: number, status: GatePassStatus): 'complete' | 'active' | 'denied' | 'inactive' {
  if (status === 'denied') {
    if (stepIndex < 1) return 'complete'
    if (stepIndex === 1) return 'denied'
    return 'inactive'
  }

  const completedUpTo: Record<GatePassStatus, number> = {
    pending: 0,
    approved: 1,
    denied: 1,
    checked_out: 2,
    checked_in: 3,
  }

  const completedSteps = completedUpTo[status]

  if (stepIndex < completedSteps) return 'complete'
  if (stepIndex === completedSteps) return 'active'
  return 'inactive'
}

interface StatusTrackerProps {
  status: GatePassStatus
  deniedReason?: string | null
}

export function StatusTracker({ status, deniedReason }: StatusTrackerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const state = getStepState(i, status)
          const isLast = i === STEPS.length - 1

          return (
            <div key={step} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 shrink-0">
                {state === 'complete' && (
                  <CheckCircle2 className="h-5 w-5 text-primary fill-primary/10" />
                )}
                {state === 'active' && (
                  <div className="h-5 w-5 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
                {state === 'denied' && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {state === 'inactive' && (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
                <span className={cn(
                  'text-[10px] font-medium text-center leading-tight hidden sm:block',
                  state === 'complete' && 'text-primary',
                  state === 'active' && 'text-primary',
                  state === 'denied' && 'text-destructive',
                  state === 'inactive' && 'text-muted-foreground',
                )}>
                  {step}
                </span>
              </div>
              {!isLast && (
                <div className={cn(
                  'h-0.5 flex-1',
                  state === 'complete' ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </div>
          )
        })}
      </div>

      {status === 'denied' && deniedReason && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <span className="font-medium">Reason: </span>{deniedReason}
        </p>
      )}
    </div>
  )
}

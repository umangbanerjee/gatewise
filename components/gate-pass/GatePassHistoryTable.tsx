import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import type { GatePass } from '@/types'

const STATUS_BADGE: Record<string, { label: string; variant: string }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  denied: { label: 'Rejected', variant: 'destructive' },
  checked_out: { label: 'Marked Out', variant: 'info' },
  checked_in: { label: 'Marked In', variant: 'secondary' },
}

interface GatePassHistoryTableProps {
  passes: GatePass[]
}

export function GatePassHistoryTable({ passes }: GatePassHistoryTableProps) {
  if (passes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No records found.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Student Name</TableHead>
          <TableHead>Out Time</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {passes.map((p) => {
          const statusInfo = STATUS_BADGE[p.status] ?? { label: p.status, variant: 'outline' }
          const isOngoing = ['pending', 'approved', 'checked_out'].includes(p.status)
          return (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {p.id.slice(0, 6).toUpperCase()}
              </TableCell>
              <TableCell className="font-medium">
                {p.student?.full_name ?? '—'}
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(p.exit_datetime), 'dd MMM yyyy, h:mm a')}
              </TableCell>
              <TableCell>{p.to_location}</TableCell>
              <TableCell>
                <Badge variant={isOngoing ? 'info' : 'secondary'}>
                  {isOngoing ? 'On-Going' : 'Closed'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

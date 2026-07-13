'use client'

import { useEffect, useState, useCallback } from 'react'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GatePassForm } from '@/components/gate-pass/GatePassForm'
import { StatusTracker } from '@/components/gate-pass/StatusTracker'
import { GatePassHistoryTable } from '@/components/gate-pass/GatePassHistoryTable'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import type { GatePass } from '@/types'

export default function GatePassPage() {
  const [passes, setPasses] = useState<GatePass[]>([])
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)

  // Client-side role guard
  useEffect(() => {
    async function checkRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'student') { window.location.href = '/access-denied'; return }
      setRoleChecked(true)
    }
    checkRole()
  }, [])

  const fetchPasses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gate-passes')
      if (res.ok) setPasses(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (roleChecked) fetchPasses()
  }, [roleChecked, fetchPasses])

  const ongoing = passes.filter(p => ['pending', 'approved', 'checked_out'].includes(p.status))
  const history = passes.filter(p => ['denied', 'checked_in'].includes(p.status))

  if (!roleChecked) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">Exit Pass</h1>

      <Tabs defaultValue="ongoing">
        <TabsList>
          <TabsTrigger value="ongoing">On-Going</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-6">
          {/* Create form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Exit Pass Request</CardTitle>
            </CardHeader>
            <CardContent>
              <GatePassForm onCreated={(gp) => setPasses(prev => [gp, ...prev])} />
            </CardContent>
          </Card>

          {/* Active passes */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
            </div>
          ) : ongoing.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active gate passes.</p>
          ) : (
            <div className="space-y-4">
              {ongoing.map(gp => (
                <Card key={gp.id} className="overflow-hidden">
                  <div className="flex">
                    {/* Left accent strip */}
                    <div className="w-10 bg-primary flex items-center justify-center shrink-0">
                      <span className="text-white text-[9px] font-bold writing-mode-vertical rotate-180 tracking-widest"
                            style={{ writingMode: 'vertical-rl' }}>
                        EXIT PASS
                      </span>
                    </div>
                    <CardContent className="flex-1 p-4 space-y-4">
                      {/* Pass header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Starex University</p>
                          <p className="font-semibold">{gp.from_location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Destination</p>
                          <p className="font-semibold">{gp.to_location}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Exit</p>
                          <p className="font-medium">{format(new Date(gp.exit_datetime), 'HH:mm')}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(gp.exit_datetime), 'EEEE, dd MMM yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Return</p>
                          <p className="font-medium">{format(new Date(gp.return_datetime), 'HH:mm')}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(gp.return_datetime), 'EEEE, dd MMM yyyy')}</p>
                        </div>
                      </div>

                      <StatusTracker status={gp.status} deniedReason={gp.denied_reason} />
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gatepass History</CardTitle>
              <p className="text-sm text-muted-foreground">View and manage all of your past gatepass records in one place.</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <GatePassHistoryTable passes={history} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

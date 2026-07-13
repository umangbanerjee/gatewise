'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GatePassCard } from '@/components/gate-pass/GatePassCard'
import { GatePassHistoryTable } from '@/components/gate-pass/GatePassHistoryTable'
import { createClient } from '@/lib/supabase/client'
import type { GatePass } from '@/types'

export default function ApprovalsPage() {
  const [pending, setPending] = useState<GatePass[]>([])
  const [history, setHistory] = useState<GatePass[]>([])
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'warden') { window.location.href = '/access-denied'; return }
      setRoleChecked(true)
    }
    checkRole()
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pendingRes, historyRes] = await Promise.all([
        fetch('/api/gate-passes?status=pending'),
        fetch('/api/gate-passes?status=approved,denied,checked_out,checked_in'),
      ])
      if (pendingRes.ok) setPending(await pendingRes.json())
      if (historyRes.ok) setHistory(await historyRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (roleChecked) fetchAll()
  }, [roleChecked, fetchAll])

  function handleActionComplete(id: string) {
    // Remove from pending, refetch history
    setPending(prev => prev.filter(p => p.id !== id))
    fetchAll()
  }

  if (!roleChecked) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Exit Pass Approval</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No pending requests.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {pending.map(gp => (
                <GatePassCard
                  key={gp.id}
                  gatePass={gp}
                  showActions
                  onActionComplete={handleActionComplete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card className="mt-2">
            <CardHeader>
              <CardTitle className="text-base">Gatepass History</CardTitle>
              <p className="text-sm text-muted-foreground">
                View and manage all past gatepass records in one place.
              </p>
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

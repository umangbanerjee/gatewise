'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Search } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckoutCard } from '@/components/checkout/CheckoutCard'
import { createClient } from '@/lib/supabase/client'
import type { GatePass } from '@/types'

export default function CheckoutPage() {
  const [approved, setApproved] = useState<GatePass[]>([])
  const [checkedOut, setCheckedOut] = useState<GatePass[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'security') { window.location.href = '/access-denied'; return }
      setRoleChecked(true)
    }
    checkRole()
  }, [])

  const fetchAll = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('search', q)

      const [approvedRes, checkedOutRes] = await Promise.all([
        fetch(`/api/gate-passes?status=approved${q ? `&search=${encodeURIComponent(q)}` : ''}`),
        fetch(`/api/gate-passes?status=checked_out${q ? `&search=${encodeURIComponent(q)}` : ''}`),
      ])
      if (approvedRes.ok) setApproved(await approvedRes.json())
      if (checkedOutRes.ok) setCheckedOut(await checkedOutRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (roleChecked) fetchAll()
  }, [roleChecked, fetchAll])

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchAll(val), 300)
  }

  function handleActionComplete(id: string) {
    setApproved(prev => prev.filter(p => p.id !== id))
    setCheckedOut(prev => prev.filter(p => p.id !== id))
    fetchAll(search)
  }

  if (!roleChecked) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-primary">Student Checkout</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by student name or enrolment no."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <Tabs defaultValue="checkout">
        <TabsList>
          <TabsTrigger value="checkout">Check Out</TabsTrigger>
          <TabsTrigger value="checkin">Check In</TabsTrigger>
        </TabsList>

        <TabsContent value="checkout">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : approved.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No approved passes waiting for checkout.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {approved.map(gp => (
                <CheckoutCard
                  key={gp.id}
                  gatePass={gp}
                  action="checkout"
                  onActionComplete={handleActionComplete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="checkin">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : checkedOut.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No students currently off-campus for check-in.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {checkedOut.map(gp => (
                <CheckoutCard
                  key={gp.id}
                  gatePass={gp}
                  action="checkin"
                  onActionComplete={handleActionComplete}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

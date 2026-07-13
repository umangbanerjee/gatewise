'use client'

import { useEffect, useState } from 'react'
import { WardenStats } from '@/components/dashboard/WardenStats'
import type { DashboardStats } from '@/types'

export function WardenStatsClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) setStats(await res.json())
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return <WardenStats stats={stats} loading={loading} />
}

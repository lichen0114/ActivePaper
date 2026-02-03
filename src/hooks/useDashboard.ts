import { useState, useEffect, useCallback } from 'react'

interface DashboardData {
  recentDocuments: Document[]
  documentStats: DocumentActivity[]
  activityByDay: DailyActivityCount[]
  conceptGraph: ConceptGraphData
  dueReviewCount: number
  isLoading: boolean
  error: string | null
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    recentDocuments: [],
    documentStats: [],
    activityByDay: [],
    conceptGraph: { nodes: [], links: [] },
    dueReviewCount: 0,
    isLoading: true,
    error: null,
  })

  const loadDashboardData = useCallback(async () => {
    if (!window.api) return

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }))

      const [
        recentDocuments,
        documentStats,
        activityByDay,
        conceptGraph,
        dueReviewCount,
      ] = await Promise.all([
        window.api.getRecentDocuments(3),
        window.api.getDocumentActivityStats(),
        window.api.getActivityByDay(90),
        window.api.getConceptGraph(),
        window.api.getDueReviewCount(),
      ])

      setData({
        recentDocuments,
        documentStats,
        activityByDay,
        conceptGraph,
        dueReviewCount,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load dashboard data',
      }))
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  return {
    ...data,
    refresh: loadDashboardData,
  }
}

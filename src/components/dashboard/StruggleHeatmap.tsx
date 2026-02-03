import { useMemo } from 'react'

interface StruggleHeatmapProps {
  documentStats: DocumentActivity[]
  activityByDay: DailyActivityCount[]
}

interface DayData {
  date: string
  explain: number
  summarize: number
  define: number
  total: number
}

function getDayClass(day: DayData): string {
  if (day.total === 0) return 'empty'

  const explainRatio = day.explain / day.total
  const summarizeRatio = day.summarize / day.total

  // Determine intensity (1-4 based on total count)
  const intensity = Math.min(4, Math.ceil(day.total / 2))

  if (explainRatio > 0.6) return `explain-${intensity}`
  if (summarizeRatio > 0.6) return `summarize-${intensity}`
  return `mixed-${intensity}`
}

function generateCalendarDays(activityByDay: DailyActivityCount[], weeks: number = 12): DayData[][] {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (weeks * 7) + 1)

  // Create a map of activity by date string
  const activityMap = new Map<string, DailyActivityCount>()
  activityByDay.forEach(day => {
    activityMap.set(day.date, day)
  })

  // Generate weeks array (7 days each)
  const calendar: DayData[][] = []
  const current = new Date(startDate)

  // Align to start of week (Sunday)
  current.setDate(current.getDate() - current.getDay())

  for (let week = 0; week < weeks; week++) {
    const weekDays: DayData[] = []
    for (let day = 0; day < 7; day++) {
      const dateStr = current.toISOString().split('T')[0]
      const activity = activityMap.get(dateStr)

      weekDays.push({
        date: dateStr,
        explain: activity?.explain_count || 0,
        summarize: activity?.summarize_count || 0,
        define: activity?.define_count || 0,
        total: (activity?.explain_count || 0) + (activity?.summarize_count || 0) + (activity?.define_count || 0),
      })

      current.setDate(current.getDate() + 1)
    }
    calendar.push(weekDays)
  }

  return calendar
}

export default function StruggleHeatmap({
  documentStats,
  activityByDay,
}: StruggleHeatmapProps) {
  const calendar = useMemo(() => generateCalendarDays(activityByDay, 12), [activityByDay])

  const totalStats = useMemo(() => {
    return documentStats.reduce(
      (acc, doc) => ({
        explain: acc.explain + doc.explain_count,
        summarize: acc.summarize + doc.summarize_count,
        define: acc.define + doc.define_count,
      }),
      { explain: 0, summarize: 0, define: 0 }
    )
  }, [documentStats])

  return (
    <div className="heatmap-container h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-sm">Activity</h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500" />
            <span className="text-gray-400">Understand</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-rose-500" />
            <span className="text-gray-400">Struggle</span>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
          <div className="text-emerald-400 font-semibold text-lg">{totalStats.summarize}</div>
          <div className="text-gray-500 text-xs">Summaries</div>
        </div>
        <div className="bg-rose-500/10 rounded-lg p-2 text-center">
          <div className="text-rose-400 font-semibold text-lg">{totalStats.explain}</div>
          <div className="text-gray-500 text-xs">Explanations</div>
        </div>
        <div className="bg-indigo-500/10 rounded-lg p-2 text-center">
          <div className="text-indigo-400 font-semibold text-lg">{totalStats.define}</div>
          <div className="text-gray-500 text-xs">Definitions</div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex-1 overflow-hidden">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 text-xs text-gray-600 pr-1">
            <div className="h-[10px]" /> {/* Spacer for alignment */}
            <div className="h-[10px] flex items-center">S</div>
            <div className="h-[10px]" />
            <div className="h-[10px] flex items-center">T</div>
            <div className="h-[10px]" />
            <div className="h-[10px] flex items-center">T</div>
            <div className="h-[10px]" />
          </div>

          {/* Weeks */}
          <div className="flex gap-1 overflow-x-auto">
            {calendar.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((day, dayIdx) => (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={`heatmap-pixel ${getDayClass(day)}`}
                    title={`${day.date}: ${day.total} queries`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document list */}
      {documentStats.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800/50">
          <h4 className="text-gray-400 text-xs font-medium mb-2">Documents</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {documentStats.slice(0, 5).map((doc) => (
              <div key={doc.document_id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs truncate">{doc.filename}</div>
                </div>
                <div className="flex gap-1">
                  {doc.summarize_count > 0 && (
                    <span className="text-emerald-400 text-xs">{doc.summarize_count}</span>
                  )}
                  {doc.explain_count > 0 && (
                    <span className="text-rose-400 text-xs">{doc.explain_count}</span>
                  )}
                  {doc.define_count > 0 && (
                    <span className="text-indigo-400 text-xs">{doc.define_count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useMemo } from 'react'

interface ContextPrimingCardsProps {
  documents: Document[]
  documentStats: DocumentActivity[]
  onOpenDocument: (filepath: string) => void
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}

function getCardAccent(stats: DocumentActivity | undefined): 'emerald' | 'rose' | 'indigo' {
  if (!stats) return 'indigo'

  const total = stats.explain_count + stats.summarize_count + stats.define_count
  if (total === 0) return 'indigo'

  const explainRatio = stats.explain_count / total
  const summarizeRatio = stats.summarize_count / total

  if (explainRatio > 0.5) return 'rose' // Mostly explanations = struggle
  if (summarizeRatio > 0.5) return 'emerald' // Mostly summaries = understanding
  return 'indigo' // Mixed
}

export default function ContextPrimingCards({
  documents,
  documentStats,
  onOpenDocument,
}: ContextPrimingCardsProps) {
  const cardsData = useMemo(() => {
    return documents.map(doc => {
      const stats = documentStats.find(s => s.document_id === doc.id)
      return {
        ...doc,
        stats,
        accent: getCardAccent(stats),
        timeAgo: formatTimeAgo(doc.last_opened_at),
      }
    })
  }, [documents, documentStats])

  if (cardsData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">No recent documents</p>
      </div>
    )
  }

  return (
    <div className="h-full flex gap-3 items-stretch">
      {cardsData.map((card) => (
        <button
          key={card.id}
          className={`context-card ${card.accent} flex-1 p-4 text-left cursor-pointer`}
          onClick={() => onOpenDocument(card.filepath)}
        >
          {/* Top section */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm truncate pr-2">
                {card.filename}
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">{card.timeAgo}</p>
            </div>
            <div className={`
              w-2 h-2 rounded-full flex-shrink-0
              ${card.accent === 'emerald' ? 'bg-emerald-500' : ''}
              ${card.accent === 'rose' ? 'bg-rose-500' : ''}
              ${card.accent === 'indigo' ? 'bg-indigo-500' : ''}
            `} />
          </div>

          {/* Stats bar */}
          {card.stats && card.stats.total_interactions > 0 && (
            <div className="mb-3">
              <div className="flex gap-0.5 h-1 rounded-full overflow-hidden bg-gray-800">
                {card.stats.summarize_count > 0 && (
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ flex: card.stats.summarize_count }}
                  />
                )}
                {card.stats.explain_count > 0 && (
                  <div
                    className="bg-rose-500 h-full"
                    style={{ flex: card.stats.explain_count }}
                  />
                )}
                {card.stats.define_count > 0 && (
                  <div
                    className="bg-indigo-500 h-full"
                    style={{ flex: card.stats.define_count }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Bottom section */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {card.stats ? `${card.stats.total_interactions} queries` : 'No queries yet'}
            </span>
            {card.total_pages && (
              <span className="text-gray-600">{card.total_pages} pages</span>
            )}
          </div>

          {/* Resume indicator */}
          <div className="mt-3 pt-3 border-t border-gray-800/50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Resume reading</span>
            </div>
          </div>
        </button>
      ))}

      {/* Placeholder cards if less than 3 */}
      {Array.from({ length: Math.max(0, 3 - cardsData.length) }).map((_, i) => (
        <div
          key={`placeholder-${i}`}
          className="context-card indigo flex-1 p-4 opacity-30 flex items-center justify-center"
        >
          <span className="text-gray-600 text-xs">Open a PDF</span>
        </div>
      ))}
    </div>
  )
}

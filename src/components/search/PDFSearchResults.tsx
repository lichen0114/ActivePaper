import type { PDFSearchMatch } from '../../hooks/useSearch'

interface PDFSearchResultsProps {
  query: string
  matches: PDFSearchMatch[]
  isLoading: boolean
  selectedIndex: number
  onResultClick?: (match: PDFSearchMatch, index: number) => void
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightQuery(text: string, query: string): string {
  const safeText = escapeHtml(text)
  const trimmed = query.trim()
  if (!trimmed) return safeText
  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, 'gi')
  return safeText.replace(
    regex,
    '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>'
  )
}

function PDFSearchResults({
  query,
  matches,
  isLoading,
  selectedIndex,
  onResultClick,
}: PDFSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Searching...</span>
      </div>
    )
  }

  if (!query.trim()) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>Search within the current PDF</p>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>No matches found</p>
      </div>
    )
  }

  let globalIndex = 0
  const annotationCount = matches.filter(m => m.kind === 'annotation').length
  const textCount = matches.length - annotationCount

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2 text-xs text-gray-500">
        <span>{textCount} text matches</span>
        <span>{annotationCount} annotations</span>
      </div>

      <div className="space-y-1">
        {matches.map((match) => {
          const isSelected = globalIndex === selectedIndex
          const currentIndex = globalIndex
          globalIndex++

          return (
            <div
              key={`${match.kind || 'text'}-${match.pageNumber}-${match.index}-${currentIndex}`}
              onClick={() => onResultClick?.(match, currentIndex)}
              className={`
                group px-3 py-2 rounded-lg cursor-pointer transition-colors
                ${isSelected ? 'bg-blue-600/30' : 'hover:bg-gray-700/30'}
              `}
            >
              <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                <span className={`px-1.5 py-0.5 rounded-full ${
                  match.kind === 'annotation'
                    ? 'bg-purple-600/30 text-purple-300'
                    : 'bg-blue-600/30 text-blue-300'
                }`}>
                  {match.kind === 'annotation' ? 'Annotation' : 'Text'}
                </span>
                <span>Page {match.pageNumber}</span>
              </div>

              <p
                className="text-sm text-gray-200 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: highlightQuery(match.text, query) }}
              />

              {match.note && (
                <p
                  className="text-xs text-gray-400 mt-1 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: highlightQuery(match.note, query) }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PDFSearchResults

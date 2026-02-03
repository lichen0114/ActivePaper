import { useState, useMemo } from 'react'

interface QuoteCardProps {
  text: string
  maxLines?: number
}

export default function QuoteCard({ text, maxLines = 3 }: QuoteCardProps) {
  const [expanded, setExpanded] = useState(false)

  const needsExpansion = useMemo(() => {
    const lineCount = text.split('\n').length
    const charThreshold = maxLines * 80
    return lineCount > maxLines || text.length > charThreshold
  }, [text, maxLines])

  return (
    <div className="relative bg-gray-700/40 rounded-lg border-l-[3px] border-blue-500 p-3">
      <svg
        className="absolute top-2 right-2 w-4 h-4 text-gray-500/50"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
      </svg>
      <p className={`text-sm text-gray-300 pr-6 ${!expanded && needsExpansion ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      {needsExpansion && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
